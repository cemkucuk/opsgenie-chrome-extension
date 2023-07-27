const OPSGENIE_DOMAIN = {
    "US": "opsgenie.com",
    "EU": "eu.opsgenie.com",
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
    if (notificationId === 'alert-list') {
        chrome.tabs.create({
            url: `https://app.${OPSGENIE_DOMAIN[settings.region]}/alert/list?query=` + encodeURI(query)
        });
    } else {
        chrome.tabs.create({
            url: 'https://opsg.in/a/i/' + notificationId
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        if (message && message.action) {
            await handleAlertAction(message, sendResponse);
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
        //sendNotificationIfNewAlerts(responseBody.data)
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
    if (latestAlertDate !== undefined) {
        var newAlerts = []
        for (let i = 0; i < data.length; i++) {
            if (latestAlertDate < data[i].createdAt)
                newAlerts.push({
                    "title": data[i].message,
                    "message": "Priority: " + data[i].priority
                })
        }
        if (newAlerts.length == 1) {
            chrome.notifications.create(data[0].id, {
                type: 'basic',
                iconUrl: 'images/128x128.png',
                title: newAlerts[0].title,
                message: newAlerts[0].message,
            }, function () {
            });
        } else if (newAlerts.length > 0) {
            chrome.notifications.create('alert-list', {
                type: 'list',
                iconUrl: 'images/128x128.png',
                title: newAlerts.length.toString() + " new alert(s)!",
                message: "",
                items: newAlerts
            }, function () {
            });
        }
    }

    if (data.length > 0) {
        latestAlertDate = data[0].createdAt
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
