var enabled = false
var requestUrl = ""
var timeInterval = 30000
var popupData = {}
var latestAlertDate

var OPSGENIE_API = "https://api.opsgenie.com/"
var OPSGENIE_API_EU = "https://api.eu.opgenie.com"

var executeWithInterval

// start
setBadge(-1)
startExecution()

chrome.storage.onChanged.addListener(function (changes, namespace) {
  startExecution()
})

chrome.runtime.onInstalled.addListener(details => {
  window.open("options.html", "_blank")
});

// for communicating with popup view
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    sendResponse(popupData)
  })

function startExecution() {
  chrome.storage.sync.get({
    region: 'US',
    apiKey: '',
    query: '',
    enabled: true,
    timeInterval: 30
  }, function (items) {
    clearTimeout(executeWithInterval)
    var url = OPSGENIE_API
    if (items.region === 'EU') {
      url = OPSGENIE_API_EU
    }
    enabled = items.enabled
    timeInterval = items.timeInterval * 1000
    if (items.apiKey !== '') {
      requestUrl = url + "v2/alerts?limit=100&sort=createdAt&" + "apiKey=" + items.apiKey + "&query=" + encodeURI(items.query)
    }
    doExecute()
  })
}

function doExecute() {
  if (requestUrl === "") {
    setFailurePopupData("Notifier is not configured, please configure your extension in <a href=\"options.html\" target=\"_blank\"> option page↗</a>.")
    return
  }
  if (!enabled) {
    setBadge(-1)
    setFailurePopupData("Alert API Poller is disabled, for enabling it use switch in <a href=\"options.html\" target=\"_blank\"> option page↗</a>.")
    return
  }
  fetch(requestUrl)
    .then(function (response) {
      if (!response.ok) {
        response.text().then(function (responseBody) {
          setBadge(-1)
          setFailurePopupData(responseBody)
          executeWithInterval = setTimeout(doExecute, timeInterval)
        })
      } else {
        response.json().then(function (responseBody) {
          setBadge(responseBody.data.length)
          setSuccessPopupData(responseBody.data)
          sendNotificationIfNewAlerts(responseBody.data)
          executeWithInterval = setTimeout(doExecute, timeInterval)
        })
      }
    })
}

function sendNotificationIfNewAlerts(data) {
  console.log("notification")
  if (latestAlertDate !== undefined) {
    var newAlerts = []
    for (let i=0; i<data.length; i++) {
      if(latestAlertDate < data[i].createdAt)
      newAlerts.push({
        "title" : data[i].message,
        "message": "Priority: " + data[i].priority
      })
    }
    if(newAlerts.length == 1) {
      chrome.notifications.create(data[0].id, {
        type: 'basic',
        iconUrl: 'images/128x128.png',
        title: newAlerts[0].title,
        message: newAlerts[0].message,
      }, function () { });
    } else if(newAlerts.length > 0) {
      chrome.notifications.create('alert-list', {
        type: 'list',
        iconUrl: 'images/128x128.png',
        title: newAlerts.length.toString() + " new alert(s)!",
        message: "",
        items: newAlerts
      }, function () { });
    }
  }
  if (data.length > 0) {
    latestAlertDate = data[0].createdAt
  }
}

chrome.notifications.onClicked.addListener(function (notificationId) {
  if (notificationId === 'alert-list') {
    window.open('https://app.opsgenie.com/', '_blank')
  } else {
    window.open('https://opsg.in/a/i/' + notificationId, '_blank')
  }
});

function setBadge(count) {
  if (count > 0) {
    // red badge with alert count
    chrome.browserAction.setBadgeText({ text: count.toString() })
    chrome.browserAction.setBadgeBackgroundColor({ color: '#DE350B' }) // red
  } else if (count < 0) {
    // remove badge, no response alert api yet
    chrome.browserAction.setBadgeText({ text: '' })
  } else {
    // empty green badge
    chrome.browserAction.setBadgeBackgroundColor({ color: '#00875A' })
    chrome.browserAction.setBadgeText({ text: ' ' })
  }
}

function setSuccessPopupData(responseData) {
  console.log("success popup data filled", responseData)
  popupData = {
    status: "success",
    reason: "",
    data: responseData.slice(0, 10),
    time: new Date().toLocaleString()
  }
}

function setFailurePopupData(message) {
  console.log("failure popup data filled", message)
  popupData = {
    status: "failure",
    reason: message,
    data: [],
    time: new Date().toLocaleString()
  }
}