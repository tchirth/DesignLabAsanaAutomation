async (event, steps, auths) => {

    const asana = require('asana');
    const datetime = require('node-datetime');
    
    const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
    
    // Asana function to add to project cleanly
    async function add_to_project(task_gid, project_gid) {
      return await client.tasks.addProjectForTask(task_gid, { project: project_gid, pretty: true });
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
    
    this.log = { 'due_date': 0, 'assignee': 0 }
    // Iterate though tasks in master that have subtasks
    for ([gid, task] of Object.entries(steps.master_tasks.tasks)) {
      if (task.task.num_subtasks != 0 && !(task.task.notes.substr(0, 20).includes('$ST_DO_NOT_SYNC'))) {
        // Get subtasks & filter for those that are not completed AND have a due date.
        subtasks = (await client.tasks.getSubtasksForTask(gid, { 'opt_fields': 'due_on,assignee.gid, completed' })).data
        subtasks = subtasks.filter(function (sub) { return ('due_on' in (sub) && sub.due_on != null && sub.completed == false) });
        if (subtasks.length == 0) {
          continue;
        };
        // list parsed due dates & find minimum (aka earliest) due date
        sub_dates = []
        for (subtask of subtasks) {
          sub_dates.push(Date.parse(subtask.due_on));
        };
        min_date = Math.min(...sub_dates);
        if (min_date == Infinity || min_date == 0 || isNaN(min_date)) {
          continue;
        };
    
        // find the subtask matching the minimum due date
        match_subtask = subtasks.filter(function (sub) { return (Date.parse(sub.due_on) == min_date) })[0]
        min_date_iso = (new Date(min_date)).toISOString().split('T')[0];
        data = { 'due_on': min_date_iso }
        if ('assignee' in match_subtask && match_subtask.assignee != null) {
          data.assignee = match_subtask.assignee.gid
        }
        parent_data = { 'due_on': task.task.due_on }
        if ('assignee' in task.task && task.task.assignee != null) {
          parent_data.assignee = task.task.assignee.gid
        }
        // console.log(data)
        // console.log(parent_data)
        // Compare parent task's assignee/due date data to subtasks assignee/due date data
        // If they dont match, update the task and log it
        if (!(JSON.stringify(data) == JSON.stringify(parent_data))) {
          response = await client.tasks.updateTask(taskGid = gid, data)
          date = datetime.create().format('Y-m-d')
          time = datetime.create().format('H:M:S')
          row = [date, time, task.task.name]
          if ('assignee' in data && data.assignee != parent_data.assignee) {
            row.push(true)
            this.log.assignee += 1
          } else {
            row.push(false)
          }
          if ('due_on' in data && data.due_on != parent_data.due_on) {
            row.push(true)
            this.log.due_date += 1
          } else {
            row.push(false)
          }
          await print_line(row, 'SubtaskActions')
        };
      };
    };
}