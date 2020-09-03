
important_fields = ['assignee', 'due_on', 'custom_fields', 'completed']
header = steps.params.header.toLowerCase()
if ('body_b64' in steps.trigger.raw_event) {
  this.body = JSON.parse((new Buffer.from(steps.trigger.raw_event.body_b64, 'base64')).toString('ascii')).events
  this.tasks = {}
  for (item of this.body) {
    gid = item.resource.gid
    if (!(gid in this.tasks)) {
      this.tasks[gid] = {'added': [], 'changed':[]};      
    };

    switch (item.action) {
      case 'changed':
        field = item.change.field
        if (important_fields.includes(field)) {
          this.tasks[gid].changed.push(item);
        };
        break;
      case 'added':
        parent_type = item.parent.resource_type
        if (parent_type.includes('section')) {
          this.tasks[gid].added.push(item);
        }
        break;   
      default:
        console.log('Unknown or unused webhook type');
        continue;
    };
    
  };
} else {
  $end('Base64 Body not in webhook trigger')
}


for ([gid, task] of Object.entries(this.tasks)) {
  
  if (task.added.length == 0 && task.changed.length == 0) {
    delete this.tasks[gid];
    continue;
  };


  try {
    return_task = await require("@pipedreamhq/platform").axios(this, {
      url: `https://app.asana.com/api/1.0/tasks/${gid}?`,
      headers: {
        Authorization: `Bearer ${auths.asana.oauth_access_token}`,
      }
    });
    this.tasks[gid].task = return_task.data;
  } catch (error) {
    console.log(`Task with gid: ${gid} could not be found.`)
    continue;
  };
  if (task.task.notes.substr(0,20).includes('$DO_NOT_SYNC')) {
    delete this.tasks[gid];
    continue;
  };
  
  due_date = (element) => element.change.field == 'due_on'
  assignee = (element) => element.change.field == 'assignee'
  completed = (element) => element.change.field == 'completed'
  if (task.changed.some(due_date) || task.changed.some(assignee) || task.changed.some(completed)) {
    if (task.task.parent) {
      this.tasks[gid].parent = this.tasks[gid].task.parent.gid
      continue;
    };
  };
 
  custom_fields = (element) => element.change.field == 'custom_fields'
  if (task.changed.some(custom_fields)) {
    agenda_field = task.task.custom_fields.filter(function (field) {return field.name == 'Agenda Discussion';})[0];
    status_field = task.task.custom_fields.filter(function (field) {return field.name == 'Status_';})[0];
    agenda_field_gid = agenda_field.gid;
    status_field_gid = status_field.gid;
    change_is_agenda = (element) => ('new_value' in element.change && element.change.new_value.gid == agenda_field_gid);
    change_is_status = (element) => ('new_value' in element.change && element.change.new_value.gid == status_field_gid);
    if (task.changed.some(change_is_agenda)) {
      // console.log(task.task.custom_fields.findIndex(change_is_agenda))
      if ('enum_value' in agenda_field && agenda_field.enum_value != null) {
        this.tasks[gid].agendaVal = true;
      } else {
        this.tasks[gid].agendaVal = false;
      };
    };

    if (task.changed.some(change_is_status)) {
      // console.log(task.task.custom_fields.findIndex(change_is_status))
      if ('enum_value' in status_field && status_field.enum_value != null && status_field.enum_value.name == 'On Hold') {
        this.tasks[gid].holdVal = true;
      } else {
        this.tasks[gid].holdVal = false;
      };
    };  
  };


  function is_master(membership) {
    proj_name = membership.project.name.toLowerCase()
    return (proj_name.includes(header) && proj_name.includes('master'))
  }
  this.tasks[gid].section = task.task.memberships.filter(is_master)[0].section.gid

  this.tasks[gid].projects = []
  for (project of task.task.projects) {
    this.tasks[gid].projects.push(project.gid)
  }

};

if (Object.keys(this.tasks).length == 0) {
  $end('No actions to be taken.')
};
