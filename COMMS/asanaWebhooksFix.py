# This script, when the correct data is put into the variables at the start, 
# will establish a webhook with the selected project that alerts the selected url 
# of new tasks or changes in the listed fields of other tasks. These filters can be easily edited.
# For more, see documentation at https://developers.asana.com/docs/webhooks
import asana

apiKey = '1/xxxxxxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
workspaceGID = 'xxxxxxxxxxxxxxx'
projectGID = 'xxxxxxxxxxxxxxxx'
targetURL = 'https://xxxxxxxxxxx'


def printList(list):
    for i in range(len(list)):
        print(list[i])


client = asana.Client.access_token(apiKey)

# Existing Webhooks
webhooks = list(client.webhooks.get_webhooks({"workspace": workspaceGID}))
printList(webhooks)

# Create a new webhook
result = list(client.webhooks.create_webhook({
    "filters": [
        {
            "action": "added",
            "resource_type": "task"
        },
        {
            "action": "changed",
            "fields": [
                "due_on",
                "assignee",
                "custom_fields",
                "completed"
            ],
            "resource_type":"task"
        }
    ],
    "resource": projectGID,
    "target": targetURL
}))

# Print results and new list of webhooks
print(result)
printList(list(client.webhooks.get_webhooks({"workspace": workspaceGID})))

# THESE ARE ALSO USEFUL FUNCTIONS FOR WEBHOOKS
# delete_result = client.webhooks.delete_webhook(webhook_gid)
# get_result = client.webhooks.get_webhook(webhook_gid)
