# Webhooks
This workflow recieves webhooks whenever a new task is created in or added to any of the following projects: 
- COMMS - OPS
- COMMS - Analytics/SEO
- COMMS - Newsletter
- COMMS - Articles
- COMMS - Digital Media
- COMMS - Engagement
- COMMS - Video/Photo
- COMMS - Campaigns
- COMMS - Meeting Agenda

This list is accurate as of Sept. 2020, but may need to be updated if new subprojects are added under the COMMS header.

# Parameters
***header***: COMMS

# Logging
Many steps include an asynchronous function that prints a line to the google sheet specified in the params step. This helps keep a log of all actions taken by the automation. After it takes any action such as changing the due date of a task or adding the task to a project, the program creates a row and prints it to the gsheet file in the corresponding page.

# Steps
## create_or_respond
If the webhook is being established, it will include 'x-hook-secret' as a key. In this case, this step sends a successful response and logs 'x-hook-secret'. This value needs to be recorded when manually logging the webhook in the spreadsheet. It then ends the workflow, as the webhook contains no event data.

If the webhook is not new and acutally contains event data, is sends a success response and continues to the following steps.

---

## params
This sets parameters like the project header and the google sheet ID for the sync log. This allows for expansion to other groups with different headers (eg. CMNT, etc.) without requiring signifanct recoding. In theory, one can just copy the workflow, change the header parameter (and gsheet id), and establish the proper webhook for this to work with a new group.

---
## tasks
Unlike the master sync workflow, there is only one action to be taken here, so this step just decodes body of the webhook and creates an object for the items in it that were added a project. It does not care when something is added to a section. It also records the parent gid of said project the task has been added to.

---
## get_gids 
This steps creates accesses the database of project and section gid's kept in Google Sheets and creates 3 objects.

steps.get_gids.projs has a key, value pair with each project name under the defined **header** parameter and its corresponding gid.

steps.get_gids.sections has a key value pair for each section's gid in **COMMS - MASTER** and its corresponding name.

steps.get_gids.matches_p2s has a key, value pair matching project's gid to the corresponding section's gid. This matching is done each day when the corresponding database workflow refreshes the databse. This is when we sync tasks from sections to their corresponding subproject.


---
## match
This step iterates though the tasks in the webhook body and checks if they are in the MASTER project. If they already are, no action is taken, even to move them to the corresponding section. If the task is not already in the MASTER project, it gets added to the MASTER under section corresponding to the subproject the task is being synced from.

Importantly, if the task is already in the master, but not in the section corresponding to the subproject, *NO ACTION* is taken to move task to that section. Imagine a task in two subprojects, as well as the master. This would create a loop where it moves the task to the section corresponding to the first subproject, then tries to sync with the second subproject by moving it to *that* corresponding section, and then tries to sync with the first subproject again. This would have no real endpoint and result in tasks randomly moving around between sections. It would also use up a large amount of out computing quota.