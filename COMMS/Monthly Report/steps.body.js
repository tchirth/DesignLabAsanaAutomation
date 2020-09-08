async (event, steps, auths) => {
    const asana = require('asana')
    const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
    master_gid = steps.params.master_gid

    // Get/make dictionary of section in master project
    this.sections = {}
    sections = (await client.sections.getSectionsForProject(master_gid)).data
    for (section of sections) {
    this.sections[section.gid] = section.name
    }

    // Get/make list of all tasks in master project
    this.task_array = []
    opt_fields = 'gid,completed,completed_at,name,memberships.project,memberships.section,num_subtasks'
    tasks_page = await client.tasks.getTasksForProject(master_gid, { 'limit': 100, 'opt_fields': opt_fields })
    this.task_array = this.task_array.concat(tasks_page.data)
    while ('next_page' in tasks_page._response && tasks_page._response.next_page != null) {
    offset = tasks_page._response.next_page.offset
    tasks_page = await client.tasks.getTasksForProject(master_gid, { 'limit': 100, 'opt_fields': opt_fields, 'offset': offset })
    this.task_array = this.task_array.concat(tasks_page.data)
    };
    capsList = ['OPS:', 'ARTICLES:', 'ANALYTICS:', 'SOCIAL MEDIA:', 'DIGITAL MEDIA:', 'ENGAGEMENT:', 'VIDEO/PHOTO:', 'NEWSLETTER:']

    this.body = [['Date & Time Completed', 'Section', 'Task Name', 'Subtask Name (if applicable)']]

    // Create month string for prior month (month that just finished)
    report_month = (steps.params.runtimestamp.substring(5, 7) - 1).toString().padStart(2, '0')
    report_month = steps.params.runtimestamp.substring(0, 5).concat(report_month)

    // Iterate through tasks
    for (task of this.task_array) {
    master_memb = task.memberships.filter(function (memb) { return memb.project.gid == steps.params.master_gid })[0]
    section = this.sections[master_memb.section.gid]
    // Remove caps header from title
    if (capsList.some((header) => task.name.includes(header))) {
        index = task.name.indexOf(':') + 1
        task.name = task.name.substring(index).trim()
    }
    // If task was completed this month, log it
    if (task.completed == true && task.completed_at.substring(0, 7) == report_month) {
        row = [task.completed_at, section, task.name]
        this.body.push(row)
    };

    // if task has subtasks that were completed this month, log them
    if (task.num_subtasks != 0) {
        subtasks = await client.tasks.getSubtasksForTask(taskGid = task.gid, { 'opt_fields': 'name,completed_at,completed' });
        subtasks = subtasks.data.filter(function (sub) { return (sub.completed == true && sub.completed_at.substring(0, 7) == report_month) });
        for (subtask of subtasks) {
        row = [subtask.completed_at, section, task.name, subtask.name]
        this.body.push(row)
        };
    };
    };
    this.report_month = report_month
}