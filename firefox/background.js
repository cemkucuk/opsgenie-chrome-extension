const OPSGENIE_DOMAIN = {
    "US": "opsgenie.com",
    "EU": "eu.opsgenie.com",
}

const notificationPriorityMap = {
    "P1": 2,
    "P2": 1,
    "P3": 0,
    "P4": 0,
    "P5": 0,
}

const defaultSettings = {
    enabled: true,
    region: 'US',
    customerName: '',
    username: '',
    apiKey: '',
    query: '',
    timeInterval: 1
}

initExtension();

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        chrome.tabs.create({
            url: "options.html"
        });
    }

    return initExtension();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        return initExtension();
    }
});

chrome.alarms.onAlarm.addListener(alarm => {
    (async () => {
        await doExecute(await chrome.storage.sync.get(defaultSettings));
    })();

    return true;
});

chrome.notifications.onClicked.addListener((notificationId) => {
    (async () => {
        if (notificationId === 'opsgenie-alert-list') {
            const settings = await chrome.storage.sync.get(defaultSettings)

            let ogUrl = 'https://'
            if (settings.customerName !== '') {
                ogUrl += `${settings.customerName}.`
            }

            ogUrl += `app.${OPSGENIE_DOMAIN[settings.region]}/alert/list?query=${encodeURI(settings.query)}`

            chrome.tabs.create({
                url: ogUrl
            });
        } else {
            chrome.tabs.create({
                url: 'https://opsg.in/a/i/' + notificationId
            });
        }
    })();

    return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;

    (async () => {
        switch (message.action) {
            case 'reload':
                await doExecute(await chrome.storage.sync.get(defaultSettings));
                break
            default:
                await handleAlertAction(message, sendResponse);
                break
        }
    })();

    return true;
});


function initExtension() {
    (async () => {
        setBadge(-1)
        await startExecution()
    })();

    return true;
}

async function startExecution() {
    const settings = await chrome.storage.sync.get(defaultSettings)

    if (!settings.enabled) {
        setBadge(-1)
        setPopupData(false, settings, chrome.i18n.getMessage("popupExtensionDisabled", [`<a href="options.html" target="_blank">`, "↗</a>"]))
        return
    }

    if (settings.apiKey === "") {
        setBadge(-1)
        setPopupData(false, settings, chrome.i18n.getMessage("popupApiKeyEmpty", [`<a href="options.html" target="_blank">`, "↗</a>"]))
        return
    }

    await chrome.alarms.clear('fetch')
    await chrome.alarms.create('fetch', {
        periodInMinutes: parseInt(settings.timeInterval) || 1
    });

    return doExecute(settings)
}

async function doExecute(settings) {
    let response;

    try {
        response = await fetch(`https://api.${OPSGENIE_DOMAIN[settings.region]}/v2/alerts?limit=100&sort=createdAt&query=${encodeURI(settings.query)}`, {
            headers: {
                "Authorization": `GenieKey ${settings.apiKey}`
            }
        })
    } catch (error) {
        setBadge(-1)
        setPopupData(false, settings, chrome.i18n.getMessage("popupNetworkFailure", [settings.timeInterval, error]))
        return
    }

    if (response.status !== 200) {
        setBadge(-1)
        try {
            const responseBody = await response.text()
            setPopupData(false, settings, chrome.i18n.getMessage("popupClientFailure", [settings.timeInterval, responseBody]))
        } catch (error) {
            setPopupData(false, settings, chrome.i18n.getMessage("popupClientFailure", [settings.timeInterval, error]))
        }

        return
    }

    try {
        const responseBody = await response.json()
        setBadge(responseBody.data.length)
        setPopupData(true, settings, responseBody.data)

        sendNotificationIfNewAlerts(responseBody.data)
    } catch (error) {
        setPopupData(false, settings, chrome.i18n.getMessage("popupClientFailure", [settings.timeInterval, error]))
    }
}

function setBadge(count) {
    if (count > 0) {
        // red badge with alert count
        chrome.action.setBadgeText({text: count.toString()})
        chrome.action.setBadgeBackgroundColor({color: '#DE350B'})
    } else if (count < 0) {
        // remove badge, no response alert api yet
        chrome.action.setBadgeText({text: ''})
    } else {
        chrome.action.setBadgeBackgroundColor({color: '#00875A'})
        chrome.action.setBadgeText({text: ' '})
    }
}

function setPopupData(ok, settings, data) {
    let ogUrl = 'https://'
    if (settings.customerName !== '') {
        ogUrl += `${settings.customerName}.`
    }
    ogUrl += `app.opsgenie.com/alert/list?query=${encodeURI(settings.query)}`

    const popup = {
        ok: ok,
        data: data,
        time: new Date().toLocaleString(),
        ogUrl: ogUrl
    }

    chrome.storage.session.set({popup})
}

function sendNotificationIfNewAlerts(data) {
    if (data.length === 0) {
        return
    }

    let {latestAlertDate} = chrome.storage.local.get('latestAlertDate')

    if (latestAlertDate === undefined) {
        latestAlertDate = data.reduce((r, b) => Math.max(r, b.createdAt), Number.NEGATIVE_INFINITY);
    }

    const newAlerts = data.filter(alert => latestAlertDate < alert.createdAt)
        .map(alert => {
            return alert + {
                id: alert.id,
                title: alert.message,
                message: "Priority: " + alert.priority,
                createdAt: alert.createdAt,
                priority: alert.priority
            }
        })

    if (newAlerts.length === 1) {
        chrome.notifications.create(newAlerts[0].id, {
            type: 'image',
            title: newAlerts[0].message,
            message: "Priority: " + newAlerts[0].priority,
            iconUrl: 'images/128x128.png',
            priority: notificationPriorityMap[newAlerts[0].priority] ?? 0,
            silent: notificationPriorityMap[newAlerts[0].priority] === 0,
            requireInteraction: notificationPriorityMap[newAlerts[0].priority] === 2,
            eventTime: newAlerts[0].createdAt,
        });
    } else if (newAlerts.length > 0) {
        chrome.notifications.create('opsgenie-alert-list', {
            type: 'list',
            iconUrl: 'images/128x128.png',
            title: newAlerts.length.toString() + " new alerts!",
            message: "",
            items: newAlerts.map(alert => {
                return {
                    title: alert.message,
                    message: "Priority: " + alert.priority,
                }
            })
        });
    }

    if (data.length > 0) {
        latestAlertDate = data.reduce((r, b) => Math.max(r, b.createdAt), Number.NEGATIVE_INFINITY);
        chrome.storage.local.set({latestAlertDate: data[0].createdAt})
    }
}


async function handleAlertAction(message, sendResponse) {
    try {
        const settings = await chrome.storage.sync.get(defaultSettings)
        const response = await fetch(`https://api.${OPSGENIE_DOMAIN[settings.region]}/v2/alerts/${message.id}/${message.action}`, {
            method: "POST",
            headers: {
                "Authorization": `GenieKey ${settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "user": settings.username,
                "source": "OpsGenie Notifier",
                "note": "Action executed via Alert API"
            })
        })

        if (response.status !== 200) {
            try {
                const responseText = await response.json()
                sendResponse(`ERROR: ${responseText.message}`)
            } catch (e) {
                const responseText = await response.text()
                sendResponse(`ERROR: ${responseText}`)
            }
        } else {
            sendResponse('OK')
        }
    } catch (error) {
        sendResponse(`ERROR: ${error}`)
    }
}
