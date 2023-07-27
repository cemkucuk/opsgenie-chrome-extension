const OPSGENIE_DOMAIN = {
    "US": "opsgenie.com",
    "EU": "eu.opsgenie.com",
}

setBadge(-1)
startExecution()

chrome.runtime.onStartup.addListener(() => {
    setBadge(-1)
    startExecution()
})

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        startExecution()
    }
});

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        chrome.tabs.create({
            url: "options.html"
        });
    } else {
        chrome.storage.local.clear()
    }
});

chrome.notifications.onClicked.addListener(function (notificationId) {
    if (notificationId === 'alert-list') {
        window.open(`https://app.${OPSGENIE_DOMAIN[settings.region]}/alert/list?query=` + encodeURI(query), '_blank')
    } else {
        window.open('https://opsg.in/a/i/' + notificationId, '_blank')
    }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    switch (alarm.name) {
        case 'fetch':
            doExecute();
            break
    }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message && message.action && message.action === 'ack') {
        const {settings} = await chrome.storage.session.get('settings');
        const response = await fetch(`https://api.${OPSGENIE_DOMAIN[settings.settings.region]}/v2/alerts/${message.id}/acknowledge`, {
            method: "POST",
            headers: {
                "Authorization": `GenieKey ${settings.settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "user": data.settings.ackUser,
                "source": "OpsGenie Notifier",
                "note": "Action executed via Alert API"
            })
        }).then(response => {
            console.log(response)
            if (response.status !== 200) {
                response.text().then(sendResponse)
            }

            sendResponse('OK')
        }).catch(sendResponse)

        sendResponse("OK")
    }
});

function startExecution() {
    chrome.alarms.clear('fetch')

    chrome.storage.sync.get({
        enabled: true,
        region: 'US',
        customerName: '',
        ackUser: '',
        apiKey: '',
        query: '',
        timeInterval: 1
    }).then(settings => {
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

        chrome.alarms.create('fetch', {
            periodInMinutes: parseInt(settings.timeInterval) || 1,
            delayInMinutes: 1
        });

        chrome.storage.session.set({settings}, doExecute);
    })
}

function doExecute() {
    chrome.storage.session.get('settings').then(data => {
        fetch(`https://api.${OPSGENIE_DOMAIN[data.settings.region]}/v2/alerts?limit=100&sort=createdAt&query=${encodeURI(data.settings.query)}`, {
            headers: {
                "Authorization": `GenieKey ${data.settings.apiKey}`
            }
        })
            .then(response => {
                if (response.status !== 200) {
                    response.text().then(responseBody => {
                        setBadge(-1)
                        setPopupData(false, data.settings, chrome.i18n.getMessage("popupClientFailure", [data.settings.timeInterval, responseBody]))
                    }).catch(error => {
                        setPopupData(false, data.settings, chrome.i18n.getMessage("popupClientFailure", [data.settings.timeInterval, error]))
                    })
                    return
                }

                response.json().then(responseBody => {
                    setBadge(responseBody.data.length)
                    setPopupData(true, data.settings, responseBody.data)
                }).catch(error => {
                    setPopupData(false, data.settings, chrome.i18n.getMessage("popupClientFailure", [data.settings.timeInterval, error]))
                })
                //sendNotificationIfNewAlerts(responseBody.data)
            })
            .catch(error => {
                setBadge(-1)
                setPopupData(false, data.settings, chrome.i18n.getMessage("popupNetworkFailure", [data.settings.timeInterval, error]))
            })
    })
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
