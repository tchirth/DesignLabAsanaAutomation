async (events, steps) => {
    header = steps.params.header.toLowerCase()
    // Decode webhook body from base64 & get parent gid
    if ('body_b64' in steps.trigger.raw_event) {
      this.body = JSON.parse((new Buffer.from(steps.trigger.raw_event.body_b64, 'base64')).toString('ascii')).events
      this.tasks = {}
      for (item of this.body) {
        if (item.parent.resource_type == 'project'){  
          gid = item.resource.gid
          this.tasks[gid] = item.parent.gid
        };
      };
    } else {
      $end('Base64 Body not in webhook trigger')
    }
    if (Object.keys(this.tasks).length == 0) {
      $end('No actions to be taken')
    }
}