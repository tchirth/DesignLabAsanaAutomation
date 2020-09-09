async (event, steps, auths) => {
    const asana = require('asana')
    const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
    // All tasks are synced to master so now just iterate through master
    
    // Get tasks in master
    this.task_array = []
    master_gid = steps.get_gids.master_gid
    opt_fields = 'gid,notes,completed,projects,name,due_on,assignee,projects,memberships.project,memberships.section,custom_fields,num_subtasks'
    tasks_page = await client.tasks.getTasksForProject(master_gid, {'limit':100, 'opt_fields': opt_fields})
    this.task_array = this.task_array.concat(tasks_page.data)
    while ('next_page' in tasks_page._response && tasks_page._response.next_page != null) {
      offset = tasks_page._response.next_page.offset
      tasks_page = await client.tasks.getTasksForProject(master_gid, {'limit':100,'opt_fields': opt_fields, 'offset': offset})
      this.task_array = this.task_array.concat(tasks_page.data)
    };
    
    // Create tasks object
    this.tasks = {}
    for (task of this.task_array) {
      if (!(task.notes.substr(0,20).includes('$DO_NOT_SYNC')) && task.completed == false) {
        gid = task.gid
        this.tasks[gid]= {'task': task}
        // Determine agendaVal (should it be in agenda) and holdVal (should it be in On Hold)
        agenda_field = task.custom_fields.filter(function (field) {return field.name == 'Agenda Discussion';})[0];
        status_field = task.custom_fields.filter(function (field) {return field.name == 'Status_';})[0];
        if ('enum_value' in agenda_field && agenda_field.enum_value != null) {
          this.tasks[gid].agendaVal = true;
        } else {
          this.tasks[gid].agendaVal = false;
        };
    
        if ('enum_value' in status_field && status_field.enum_value != null && status_field.enum_value.name == 'On Hold') {
          this.tasks[gid].holdVal = true;
        } else {
          this.tasks[gid].holdVal = false;
        };
    
        // Determine section in master & list projects task is in
        master_memb = task.memberships.filter(function (memb) {return memb.project.gid == steps.get_gids.master_gid})[0]
        this.tasks[gid].section = master_memb.section.gid
        this.tasks[gid].proj2 = steps.get_gids.matches_s2p[master_memb.section.gid]
        this.tasks[gid].projects = []
        for (project of task.projects) {
          this.tasks[gid].projects.push(project.gid)
        };
      };
    };
}