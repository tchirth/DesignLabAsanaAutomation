async (event, steps, params) => {
    this.master_gid = params.master_gid
    this.gsheet_id = params.gsheet_id
    // This timestamp should be for the first of a new month. The report will be generated for the prior month
    this.runtimestamp = steps.trigger.context.ts
}