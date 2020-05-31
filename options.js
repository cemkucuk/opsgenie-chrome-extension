function saveOptions() {
  var region = document.getElementById('region').value
  var apiKey = document.getElementById('api-key').value
  var query = document.getElementById('query').value
  var timeInterval = document.getElementById('time-interval').value
  var enabled = document.getElementById('poller-switch').checked
  if (apiKey === "") {
    showAlert("Api key field cannot be blank!", false)
  } else {
    chrome.storage.sync.set({
      region: region,
      apiKey: apiKey,
      query: query,
      timeInterval: timeInterval,
      enabled: enabled
    }, function () {
      showAlert("Saved successfully, badge will be refreshed now!", true)
    });
  }
}

function showAlert(message, success) {
  var div = document.getElementById('result');
  if (success) {
    div.innerHTML = "✔️ " + message;
  } else {
    div.innerHTML = "<p style=\"color:#DE350B;\">" + "⚠️ " + message + "</p>";
  }
}

function restoreOptions() {
  chrome.storage.sync.get({
    region: 'US',
    apiKey: '',
    timeInterval: 30,
    query: '',
    enabled: true
  }, function (items) {
    document.getElementById('region').value = items.region;
    document.getElementById('api-key').value = items.apiKey;
    document.getElementById('query').value = items.query;
    document.getElementById('time-interval').value = items.timeInterval
    document.getElementById('poller-switch').checked = items.enabled
  });
}


document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('submit').addEventListener('click', saveOptions);
