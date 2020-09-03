
const asana = require('asana');
const datetime = require('node-datetime');

const client = asana.Client.create().useAccessToken(auths.asana.oauth_access_token);
async function add_to_project(task_gid, project_gid) {  
  return await client.tasks.addProjectForTask(task_gid, {project: project_gid, pretty: true});
}
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
for ([gid, subtask] of Object.entries(steps.tasks.tasks)) {
  if ('parent' in subtask) {
    parent_gid = subtask.parent
    parent = await client.tasks.getTask(taskGid=parent_gid, {'opt_fields':'name,notes,due_on,assignee.gid'});
    if (parent.notes.substr(0,20).includes('$ST_DO_NOT_SYNC')) {
      continue;
    }
    
    parent.due_on = Date.parse(parent.due_on);
    subtasks = await client.tasks.getSubtasksForTask(taskGid=parent_gid, {'opt_fields':'due_on,assignee.gid,completed'});
    subtasks = subtasks.data.filter(function (sub) {return ('due_on' in (sub) && sub.due_on != null && sub.completed == false)});
    var st_due_date = Number.POSITIVE_INFINITY
    if (!('assignee' in parent) || parent.assignee == null) {
      parent.assignee = {'gid': null}
    };
    data = {'due_on':Number.POSITIVE_INFINITY}
    for (let i in subtasks) { 
      subtasks[i].due_on = Date.parse(subtasks[i].due_on);
      if (subtasks[i].due_on <= data.due_on) {
        data.due_on = subtasks[i].due_on;
        if ('assignee' in subtasks[i] && subtasks[i].assignee != null) {
          data.assignee = subtasks[i].assignee.gid;
        } else {
          delete data.assignee
        }
        
      };
    };

    if (data.due_on != Number.POSITIVE_INFINITY) {
      data.due_on = (new Date(data.due_on)).toISOString().split('T')[0];
    } else {
      continue;
    };
    
    if  (parent.due_on != null && !(isNaN(parent.due_on))) {
      parent.due_on = (new Date(parent.due_on)).toISOString().split('T')[0];
    } else {
      parent.due_on = '9999-12-31'
    }
    
    if (('due_on' in data && data.due_on != parent.due_on) || ('assignee' in data && data.assignee != parent.assignee.gid)) {
      response = await client.tasks.updateTask(taskGid=parent_gid, data);
      
      date = datetime.create().format('Y-m-d')
      time = datetime.create().format('H:M:S')
      row = [date, time, parent.name]
      if ('assignee' in data && data.assignee != parent.assignee.gid) {
        row.push(true)
      } else {
        row.push(false)
      }
      // console.log(parent)
      if ('due_on' in data && data.due_on != parent.due_on) {
        row.push(true)
      } else {
        row.push(false)
      }
      await print_line(row, 'SubtaskActions')
    };
  };
};