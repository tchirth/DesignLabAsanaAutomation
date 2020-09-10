# Project Discussion / Overview
### Asana Basics
Asana's organization is structured as shown below.
~~~
-+Workspace
    -+Project
        -+Section
            -+Task
                -+Subtask
                -+Subtask
            -+Task
        -+Section
    -+Project
~~~
Each task and subtask can have its own assignee, due date, description, comments, etc. On top of that, there are custom fields that can be added to expand this functionality. During the rest of this project, a considerable level of familiarity with Asana will be assumed.

Finally, tasks can be in multiple projects, but generally have to be manually added. These automations take that manual aspect away.
### Our Organizational Schema
We now have multiple groups working within our team. In order to clarify which projects belong to which team, all project names will start with a header naming the group. Furthermore, each group (if they want to use these automations) will have a single 'Master' project, multiple subprojects, and an agenda project (if they desire). The Master project will contain every task in all of the group's projects, while the subprojects provide a more limited view. Each such subproject will pertain to a certain major area of the group's work. For example, we have projects for "COMMS - Digital Media", "COMMS - OPS", "COMMS - Articles", etc.. These projects only contain tasks relevant to the specific area. But, all of these tasks are also in the MASTER as mentioned above. This way, we can have an easy-to-view snapshot of everything we are working on so that people in more administrative roles do not have to go into each of the other small projects to see what is going on, but simultaneously, we also have smaller, simpler areas where someone only working in that area can focus. Someone working only in Digital Media, for example, would not be burdened with or distracted by the tasks from OPS, Articles, and other fields. In the MASTER project, there is a section corresponding to each of these subprojects.

Schema Vizualization
~~~
-+COMMS
    -+COMMS - MASTER
        -+OPS
        -+Analytics/SEO
        -+Digital Media
        -+Articles
        -+...
    -+COMMS - OPS
    -+COMMS - Analytics/SEO
    -+COMMS - Digital Media
    -+COMMS - Articles
    -+COMMS - ...
    -+COMMS - Meeting Agenda
-+CMNT
    -+CMNT - MASTER
        -+Lorem
        -+Ipsum
        -+...
    -+CMNT - Lorem
    -+CMNT - Ipsum
    -+CMNT - ...
-+...
~~~
The automations made here act ***within*** one of these header-groups. They will not synchronize anything between COMMS and CMNT.

Currently (SEPT 2020), these are only set up for the COMMS group.

### Automations
- upSync
    - upSync automatically adds tasks from a subproject, such as COMMS - Digital Media to the corresponding section in the MASTER project.
- downSync
    - Complement of upSync. downSync adds tasks from a given section in the MASTER project, such as Digital Media, to the corresponding subproject.
- agendaSync
    - Uses a custom field to determine whether a task is an item to be discussed in the next meeting. If it is, it automatically gets added to the Meeting Agenda project.
- onHoldSync
    - Uses a custom field to determine whether a task has been put on hold. If so, it gets added to the "On Hold" section in the MASTER project.
- subtaskSync
    - Matches the due date and assignee of a task to its next due or most oerdue subtask.
- Monthly Report
    - Creates a list of all tasks completed in a given month for reporting purposes.

### Google Sheets
We use Google Spreadsheet files for two main purposes.
1. They act as a database where we can store and access data regularly.
2. We use them to print a log of all actions taken by these automations. This makes it easier to track the automation and make sure it is working.
We also print the Monthly Reports to Google Sheets

## Disclaimers
The writing in the documentation of this project assumes a basic level of familiarity with JavaScript, Node.JS, etc. A basic description of webhooks, specifically Asana's webhooks, will be provided, but it may not cover every concept written herein.

Furthermore, this code is configured to run inside Pipedream, not to be run on its own. Pipedream does not have a simple way to export code, so all was manually extracted from it and **IS NOT DESIGNED** to be run in Node without any modifications.

# Webhooks
A more in depth explanation of webhooks can be found [here](https://en.wikipedia.org/wiki/Webhook). This will be a basic explanation for how they work in this scenario and how we use them. Webhooks are "user-defined HTTP callbacks" that are triggered by some action or set of actions. Upon triggering, an HTTP POST request is sent to a a user-defined URL. When that URL recieves the webhook, it can trigger any number of operations. More plainly, the user tells a service, such as Asana, in this case, to send a webhook every time a certain event happend, such as a new task being created. Then the user can 'catch' those webhooks and act on them, such as we do in these automations. This provides a framework for quick, continuous integration. Webhooks are used all over the internet, but lets focus on our case specifically.

In v1 and v2 of this project, we used a polling structure. That is to say, every x minutes, the program polled Asana for all tasks and determined discrepencies to fix. To use an analogy, imagine you want to buy a certain television from the store. A polling structure like we used would be analagous to calling the store every day and saying "give me a list of everything you have in stock". Then, you check that list for the television. If the TV is not in stock, you throw out the list and call again a day later for a new stock list. Obviously this is not very efficient either for you (the user) or for the store (Asana). Webhooks, instead, would be more like this. When you decide you want the TV, you call the store, give them your phone number, and say "call me when it is in stock." Nothing else happens until the TV is restocked, at which time, they call you once and you can act on it. There are some more nuances to this, but this analogy is effective in showing some of the basic differences in a polling-based and a webhook-based structure for workflow automation. It is more efficient on both ends, necause neither party has to deal with or exchange large lists or pieces of data. Furthermore, when no change is made, no call to the client is made. The phone lines are kept open for other people, so to speak.

Another upside to webhooks here is that they are much more immediate. That is to say they occur when a change happens, allowing for immeidate action on that change. Lets go back to the TV example. If the TV is in super high demand, it might sell out in a few hours. Imagine you polled the store for their stock list at noon and the TV was not available. If the store restocks the TV at 1:00 P.M., you would not know until the next day, at which point it might already be sold out again. In this project, we are not competing with anyone else, but it is easy to see that when a change occurs between the times that you poll the client, you will not know until the next time you poll. For v2 of this project, we had automation running every 10 minutes, so when people made a change in Asana, it would take up to 10 minutes for the change to by synchronized. Using webhooks, we are notified of changes when they happen, so that synchronization usually happens within a minute, rather than taking up to 10. Helpfully, the webhook also contians the data of what was changed, meaning it can be even faster, as we do not have to check all sync operations. The webhook will say something like "the agenda field was changed for this specific task", so we know to only look at the agendaSync operation for one task, rather than looking at all operation on all tasks. Obviously the actual webhook data is somewhat more complex than that, that is what it boils down to. Overall, for a user, this immediate, conitinuous automation makes a program feel smoother and more intuitive.

This isn't to say that polling is purely inferior, however. It might have advantages in accuracy. You can imagine that if the store is very busy when the restock happens, or if they have to call many people, its possible that they would simply forget to call you. On the user end, you might just miss their call to you. Though this is rare, it would be good to call them at the end of the week or month just to make sure that you did not miss a restock. In terms of this project, we poll once a day for changes that were missed by the webhook-based side of the integration. The two parts work in tandem.

## Asana Webhooks
It is best to learn about Asana webhooks directly from [their documentation](https://developers.asana.com/docs/webhooks). I will touch on three important aspects here.

### Webhook Handshake
When you establish a webhook in Asana, they will send an initial webhook with a header called 'x-hook-secret'. Your side of the equation (whatever you are using to catch the webhook) must be able to return a successful response with that header in order to establish a webhook properly. If Asana does not recieve a proper response, the webhook will not be established.
### Filters
When establishing webhooks, you can filter for certain actions, such as getting one when a task is added, but not when a task is removed. This is helpful as it reduces load on you end since you only recieve webhooks when something important to your automations happens.
### Events
The JSON webhook will have a body that has to be decoded from base64 before use. That decoded body will have a single key, 'events', which will contain an array of all events in the webhook. Sometimes this will included multiple items over multiple tasks. Other time, this will be a single item. Further, the webhook will not contain all necessary data. You will need to, and Asana expects you to, make more calls to the API to retrieve task or project data.

Decoded Empty Webhook Body
~~~
{"events": []}
~~~

# Pipedream
[Pipedream](https://pipedream.com/) is a serverless solution to api integration and automation that allows users to create 'workflows', wherein a **trigger** activates some code. A huge upside to this service is the ability to use webhooks as this trigger to run *custom* Node.JS code steps. Without such a service, we would have to set up a server that is able to revcieve and process webhooks. Furthermore, we would want anyone to have access to this in various circumstances, which is difficult with a server and my current experience with servers.

It is reccomended that you familiarize youself with Pipedream, as this entire version of the project is designed *within* the service. Each .js file in this repository is manually copied from Pipedream steps, as right now (SEPT 2020), there is no way to export within their application.

Follwing is a simplified explanation of Pipedream.
## Workflows 
[Workflows in Pipedream](https://docs.pipedream.com/workflows/) are a sequence of linear **steps** or blocks of code that run when some **trigger** is activated.

## Triggers
Each workflow had a [trigger](https://docs.pipedream.com/workflows/steps/triggers/) step at the start. This is some action or event that causes the workflow to run. These triggers can take multiple forms, but the ones used in this project are HTTP/webhooks and Cron Scheduler. The former runs when it recieves a webhook or http request. The latter is run at some defined time interval.

## Steps
[Pipedream Steps](https://docs.pipedream.com/workflows/steps) are blocks of code used to create workflows. Within each step some code is run in Node.JS. Variables are local to that step unless passed unless defined as `this.variableName = ...`. These can then be accessed using the  `steps` object. Further, each step has its own console, export values, and errors, so you can see which specific step had an error when there is a problem with your code. 

In each step, the code written is wrapped in an async arrow function, which I have manually included in the .js files in this repository, but only the code within said function should be copied over if you are using this to recreate in Pipedream. Do not copy the initial async.

Each step can have `params` and `auths` inputs. These are objects local to that specific step. [params](https://docs.pipedream.com/workflows/steps/params/) create a place to easily input parameters at the start of the step and easily change it without having to go into the code of that step. [auths](https://docs.pipedream.com/workflows/steps/code/auth/) allow the user to use OAuth integration with a wide variety of apps to access the api from a given account. Functionality is built in for Slack, Asana, Google Sheets, and many, many more apps. This means you generally do not have to deal with api-keys and complex authorization sequences.

Pipedream has some custom or built-in integration steps known as actions that use the `auths` object and provide commonly used functionality to these apps. Some examples are 'adding a single line to a Google sheets file', 'getting a project from Asana', 'sending a message in Slack', etc. These are incredibly useful because they are very common actions and it reduces the work that the user has to do. Parameters like the body of the Slack message are passed through the `params` object for that step. Importantly, the user is allowed to customize these actions in any given workflow to specifically tailor their functinality to what the user is trying to create. This results in a huge range of functionality becoming available to even less-experienced programmers, as they can simply modify existing functions, rather than having to build something from the ground up.

## Sharing
Pipedream workflows are [shareable](https://docs.pipedream.com/workflows/managing/#sharing-workflows)! This come in two ways. They can be public, so that anyone with the shareable url can see it. Workflows are set to public by default, but in our case, we have changed them to being private. More importantly for our project, you can add collaborators to a workflow. This means that a company account can own the workflow, but other users or editors can be added. Just create accounts for them and share the workflow to them.

## Environment Variables
[Environment variables](https://docs.pipedream.com/environment-variables) are a way to store secret or sensitive data in an account and make it accessible to all workflows owned by that account. Our excample is that we use environment variables to hold Google Sheet IDs that need to be used by many workflows. If the ID has to changed, we just change the environment variable instead of having to change it in every workflow.

## Limits
As of SEPT 2020, Pipedream is completely free, but has some [limits](https://docs.pipedream.com/limits) Pipedream has a number of limits regarding HTTP request size, Queries Per Second, and Execution time per day. The most important to us here is the total execution time quota per day. Pipedream allots 1,800,000 milliseconds (30 minutes) per day per user across all workflows. Importantly, this is only workflows owned by that account. So, even though a user is editing and running a workflow, if the workflow is owned by the company account, it only impacts the company account's quota. Frequent large operations, such as polling operations eat into this very quickly. Further, each worflow can have a defined timeout limit, where if an excution takes longer than it, it will kill the operation.
 
- As noted, Pipedream is free. They do not have paid tiers, but according to them, they may offer some in the future that could expand functionality or expand these limits.
