async (event, steps) => {
    const datetime = require('node-datetime');
    this.end_time = datetime.create().format('H:M:S')
    tasks_synced = Object.keys(steps.master_tasks.tasks).length
    tasks_skipped = steps.master_tasks.task_array.length - tasks_synced
    // combine all of the logged action total into one row
    this.log = [
      steps.params.date,
      steps.params.start_time,
      this.end_time,
      steps.upsync.log,
      steps.down.log,
      steps.agenda.log.adds,
      steps.agenda.log.removes,
      steps.on_hold.log.adds,
      steps.on_hold.log.removes,
      steps.subtasks.log.assignee,
      steps.subtasks.log.due_date,
      tasks_synced,
      tasks_skipped
    ]
}