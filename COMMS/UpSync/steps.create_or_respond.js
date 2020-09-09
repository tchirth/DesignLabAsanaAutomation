async params => {
    steps = params.steps
    if ('x-hook-secret' in steps.trigger.event.headers) {
      $respond({
        status: 200,
        headers: { "X-Hook-Secret": steps.trigger.event.headers["x-hook-secret"] },
        body: { message: "Success response" }, // This can be any string, object, Buffer, or Readable stream
      });
      console.log(steps.trigger.event.headers["x-hook-secret"])
      // let process.env['x-hook-secret'] = steps.trigger.event.headers["x-hook-secret"]
      $end('Webhook handshake response sent')
    } else {
      $respond({
        status: 200,
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: { idle_timeout: 300, terminate_time: "2020-08-29T20:10:07+06:00" }, // This can be any string, object, Buffer, or Readable stream
      });
    }
}