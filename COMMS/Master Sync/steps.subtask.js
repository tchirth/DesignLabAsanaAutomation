async (event, steps, auths) => {
  const asana = require('asana');
  const datetime = require('node-datetime');

  const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);

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

  // Iterate through object & only look at tasks that are subtasks
  for ([gid, subtask] of Object.entries(steps.tasks.tasks)) {
    if ('parent' in subtask) {
      parent_gid = subtask.parent
      // Get parent task data from asana
      parent = await client.tasks.getTask(taskGid=parent_gid, {'opt_fields':'name,notes,due_on,assignee.gid'});
      // Subtask sync exception
      if (parent.notes.substr(0,20).includes('$ST_DO_NOT_SYNC')) {
        continue;
      }
      
      // parent.due_on = Date.parse(parent.due_on);
      // Get all uncompleted subtasks for parent task that have a due date
      subtasks = await client.tasks.getSubtasksForTask(taskGid=parent_gid, {'opt_fields':'due_on,assignee.gid,completed'});
      subtasks = subtasks.data.filter(function (sub) {return ('due_on' in (sub) && sub.due_on != null && sub.completed == false)});
      // List due dates for subtasks
      sub_dates = []
      for (subtask of subtasks) {
        sub_dates.push(Date.parse(subtask.due_on));
      };
      // Find minimum (aka earliest) due date
      min_date = Math.min(...sub_dates);
      if (min_date == Infinity || min_date == 0 || isNaN(min_date)) {
        continue;
      };
      // Determine the subtask with that matching due date
      match_subtask = subtasks.filter(function (sub) {return (Date.parse(sub.due_on)==min_date)})[0]
      min_date_iso = (new Date(min_date)).toISOString().split('T')[0];
      
      // create data object for subtask and parent's assignees and due dates
      data = {'due_on':min_date_iso}
      if ('assignee' in match_subtask && match_subtask.assignee != null) {
        data.assignee = match_subtask.assignee.gid
      };
      parent_data = {'due_on':parent.due_on}
      if ('assignee' in parent && parent.assignee != null) {
        parent_data.assignee = parent.assignee.gid
      };
      // If these objects, do not match, update the parent & log the action
      if (!(JSON.stringify(data)==JSON.stringify(parent_data))) {
        response = await client.tasks.updateTask(taskGid=parent_gid, data);
        date = datetime.create().format('Y-m-d')
        time = datetime.create().format('H:M:S')
        row = [date, time, parent.name]
        if ('assignee' in data && data.assignee != parent.assignee.gid) {
          row.push(true)
        } else {
          row.push(false)
        }
        if ('due_on' in data && data.due_on != parent.due_on) {
          row.push(true)
        } else {
          row.push(false)
        }
        await print_line(row, 'SubtaskActions')
      };
    };
  };
}