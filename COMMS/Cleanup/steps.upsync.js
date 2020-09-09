async (event, steps, auths) => {
    const stringSimilarity = require('string-similarity')
    const asana = require('asana');
    const datetime = require('node-datetime');
    
    const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
    // Asana function to add to project cleanly
    async function add_to_project(task_gid, project_gid) {  
      return await client.tasks.addProjectForTask(task_gid, {project: project_gid, pretty: true});
    }
    // Function to print to google sheets
    async function print_line(columns, sheetName) {
      // const { columns } = params
    
      // validate input
      if (!columns || !columns.length) {
        throw new Error("Please enter an array of elements in the `Columns` parameter above")
      } else if (!Array.isArray(columns)) {
        throw new Error("Column data is not an array. Please enter an array of elements in the `Columns` parameter above.")
      } else if (Array.isArray(columns[0])) {
        throw new Error("Column data is a multi-dimensional array. A one-dimensional is expected. If you're trying to send multiple rows to Google Sheets, search for the action to add multiple rows to Sheets, or try modifying the code for this step.")
      }
    
      const config = {
        method: "post",
        url: `https://sheets.googleapis.com/v4/spreadsheets/${steps.params.gsheet_id}/values/${sheetName}:append`,
        params: {
          includeValuesInResponse: true,
          valueInputOption: "USER_ENTERED"
        },
        headers: {
          Authorization: `Bearer ${auths.google_sheets.oauth_access_token}`,
        }, 
        data: {
        values: [columns],
        }
      }
      return (await require("@pipedreamhq/platform").axios(this, config)).updates
    }
    
    master_gid = steps.get_gids.master_gid
    this.log = 0
    // Iterate through subprojects
    for ([proj_name, proj_gid] of Object.entries(steps.get_gids.projs)) {
      // Get matching section in master
      if (proj_gid in steps.get_gids.matches_p2s) {
        master_section = steps.get_gids.matches_p2s[proj_gid]
      } else {
        master_section = steps.get_gids.sections['(no section)']
      };
      // Get all tasks in subproject
      task_array = []
      opt_fields = 'gid,notes,completed,projects,name'
      tasks_page = await client.tasks.getTasksForProject(proj_gid, {'limit':100, 'opt_fields': opt_fields})
      task_array = task_array.concat(tasks_page.data)
      while ('next_page' in tasks_page._response && tasks_page._response.next_page != null) {
        offset = tasks_page._response.next_page.offset
        tasks_page = await client.tasks.getTasksForProject(proj_gid, {'limit':100,'opt_fields': opt_fields, 'offset': offset})
        task_array = task_array.concat(tasks_page.data)
      };
      // Filter for just tasks that are not in master
      is_in_master = (element) => (element.gid == master_gid)
      task_array = task_array.filter((task) => (task.completed == false && !(task.projects.some(is_in_master)) && !(task.notes.substr(0,20).includes('$DO_NOT_SYNC'))));
      // Add tasks to master & log it
      for (task of task_array) {
        response = await client.tasks.addProjectForTask(task.gid, {project: master_gid, section: master_section, pretty: true});
        date = datetime.create().format('Y-m-d')
        time = datetime.create().format('H:M:S')
        row = [date, time, task.name, proj_name]
        await print_line(row, 'UpwardActions');
        this.log +=1
      };
    };
    
}