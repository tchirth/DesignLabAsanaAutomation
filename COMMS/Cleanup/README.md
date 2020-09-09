# Purpose
Hopefully, this workflow will never have to take any action, but it is designed to run once a day and look through every task in the Asana workspace to perform all necessary sync operations. This works in tandem with the Master Sync and UpSync workflows to catch anything that they missed and 'clean up' the remaining or outstanding sync tasks. The other workflows may enocunter small errors or timetouts, so the hope is that this workflow can make up for any small errors like that.

# CRON
Instead of using webhooks, this workflow uses a CRON trigger to run every day at midnight PST.

# Method
This is essentially what the v1 and v2 Asana Automation projects did. It is quite close to a direct translation from the old Python scripts to JavaScript. Instead of relying on webhooks, this runs at a regular interval and polls Asana for all relevant tasks. It first performs a total UpSync to make sure ALL tasks are in the Master project. It then performs a total MasterSync, performing the downSync, agendaSync, subtaskSync, and onHoldSync operations on all tasks. these steps descriptions will be somewhat repeated from the descriptions in the Master Sync README. It was a concious choice to make steps and functions in a way that they could be reused. Thus, the actual sync operation steps in this will be very similar to those found in the webhook based sync workflows. The descriptions here will also be somewhat less detailed, but for more in-depth understanding, it is reccomended to read the documentation for Master Sync and UpSync.

# Parameters
***header***: COMMS

# Logging
Many steps include an asynchronous function that prints a line to the google sheet specified in the params step. This helps keep a log of all actions taken by the automation. After it takes any action such as changing the due date of a task or adding the task to a project, the program creates a row and prints it to the gsheet file in the corresponding page.

On top of logging individual actions, each such step has a specific log to count the number of actions it takes.  At the end of the operation, these are combined into one row that get printed to the same gsheet file to keep a log of when these **cleanup** operations happen, how long they take, and how many actions it takes each time. This is organized as follows.
|    Date    | Start Time | End Time | Project Sync |            | Agenda |         | On Hold |         | Subtasks |          | Total Tasks |         |
|:----------:|:----------:|:--------:|:------------:|:----------:|:------:|:-------:|:-------:|:-------:|:--------:|:--------:|:-----------:|:-------:|
|            |            |          |   UpSynced   | DownSynced |  Added | Removed |  Added  | Removed | Assignee | Due Date |    Synced   | Skipped |
| 2020-09-09 |    7:00:00 |  7:02:00 |            0 |          0 |      0 |       0 |       0 |       0 |        0 |        0 |          58 |      52 |
|            |            |          |              |            |        |         |         |         |          |          |             |         |


# Steps
## params
This sets parameters like the project header and the google sheet ID for the sync log. This allows for expansion to other groups with different headers (eg. CMNT, etc.) without requiring signifanct recoding. In theory, one can just copy the workflow, change the header parameter (and gsheet id), and establish the proper webhook for this to work with a new group. In this workflow it also record the date and time at which the workflow *started*.

---
## get_gids
This steps creates accesses the database of project and section gid's kept in Google Sheets and creates 3 objects.

steps.get_gids.projs has a key, value pair with each project name under the defined **header** parameter and its corresponding gid.

steps.get_gids.sections has a key value pair for each section in **COMMS - MASTER** and its corresponding gid.

steps.get_gids.matches_s2p has a key, value pair matching section's gid to the corresponding subproject's gid. This matching is done each day when the corresponding database workflow refreshes the databse. This is when we sync tasks from sections to their corresponding subproject.

steps.get_gids.matches_p2s has a key, value pair matching subprojects' to the corresponding section's gid.


It also uses string similarity to determine the gid of **COMMS - MASTER** which will be used later.

---
## upsync
For each subproject under the defined **header** parameter, this step gets a list of all tasks in the subproject. Then, for each task, if the task is *not* already in the master project, it determines the corresponding section from steps.get_gids.matches_p2s and add the task to the master under said section.

---
## master_tasks
This step allows the reuse of steps from Master Sync. In the Master Sync workflow, the webhook is decoded and turned into an object with key, value pairs where the key is the gid of each task. The corresponding value includes the task data from Asana. Further, it can include two values (agendaVal and holdVal) if the events contained in the webhook pertain to those actions. Then, later steps check for these values and use them to determine what actions to make. Here, these values are established for *every* task, creating a very similar, albeit *much* larger, task object. It also record the section of the task and the projects it is in.

---
## down
Iterating through tasks in the large tasks object, each task is synchronized with the subproject corresponding to its section in **COMMS - MASTER**
1. Use steps.get_gids.matches_s2p to match the section that the task was added to with the corresponding subproject.
2. Check if the task is already in said subproject. If it is not, add the task to that project.

#### Notes
We do not remove tasks from projects in this automation because there are often instances where a task is related to two subproject. It would be complex to move a task to the corresponding subproject and remove it from all other, as well as likely confusing the user and making these automations feel less usable.

---
## agenda
Iterating through tasks in the large tasks object, this step performs the agenda synchronization on each task.

For each task, there are two boolean values. The agendaVal value is a boolean describing if the task *should* be in the agenda project. There is also a true/false for if the task *is currently* in the agenda project. This combination of two booleans gives four possible outcomes, of which we only have to act on two. If the task *should* be in the agenda and *currently is* OR if the task *should not* be in the agenda and *currently is not*, we do not need to take any action. In other words, the two booleans match and the task is where it should be relative to the agenda. Now there are two remaining possibilities.
- If the task *should* be in the agenda (agendaVal is true) and the task *is not currently in* the agenda, it gets added to the agenda project.
- If the task *should not* be in the agenda (agendaVal is false) and the task *is currently in* the agenda, it gets removed from the agenda project.

---
## on_hold
Iterating through tasks in the large tasks object, this step performs the onHold synchronization on each task.

Similarly to the Agenda operation, there are two boolean values. One describes if the task *should be in* the "On Hold" section (holdVal). The other describes if the task *currently is in* the "On Hold" section. Again, if these booleans match, there is no need to take any action, so we have two possibilities.
- If the task *should* be in the On Hold section (holdVal is true) and the task *is not currently in* the On Hold section, it gets added to the On Hold section.
- If the task *should not* be in the On Hold section (holdVal is false) and the task *is currently in* the On Hold section, it gets removed from the On Hold section.

---
## subtasks
Iterating through tasks in the large tasks object, if the task *has* subtasks, this step performs the subtask synchronization it. When retrieving the task list from Asana, we only get base tasks, meaning that these tasks are not subtasks themselves. Here, we check if the task has subtasks attatched to it instead. If so, we do the following:
1. Get all of the task's subtasks from Asana. 
2. Determine the minimum (and thus earliest) due date of any of the subtasks.
3. Compare this minimum date to the parent task's due date. If the minimum date is not equal to the parent's due date or if the minimum date's corresponding assignee is not equal to the parent's assignee, update the parent task to match. Then, print to the Google Sheets Log to record this action.

---
## log
This step logs the time at which the sync operation was completed and creates the log row described earlier under **Logging**

---
## add_single_row_to_sheet
This is a built-in Asana function to print a single row to a Google Sheet. Here, we use it to print the total log defined in steps.log to the sheet named 'cronCleanup'. This gives an easy, fast way to see how the sync operations are going.