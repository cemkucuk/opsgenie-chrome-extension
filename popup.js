var rowText = '<td>x{count}</td><td><span class="ak-lozenge ak-lozenge__appearance-default-bold {priority}-bg">{priority}</span></td><td>{message}</td>'

chrome.runtime.sendMessage({}, function (response) {
  if (response.status !== "success") {
    document.getElementById("info-text").innerHTML = '<p style="color:#BF2600">' + response.reason + "</p>"
  } else {
    console.log(response)
    var infoText = document.getElementById("info-text")
    infoText.style.removeProperty("padding")
    infoText.innerHTML = "<i>Last updated <b>@ " + response.time + "</b></i>" + "<a style=\"float: right;\" href=\"https://app.opsgenie.com\" target=\"_blank\"> see all alerts↗ </a>"
    var table = document.getElementById("alert-list");
    response.data.forEach(function (alert, i) {
      var row = table.insertRow(i + 1);
      row.setAttribute("id", alert.id)
      row.innerHTML = rowText
        .replace("{message}", alert.message)
        .replace("{count}", alert.count)
        .replace(/{priority}/g, alert.priority)
    });
  }
});

document.querySelector('#alert-list').onclick = function (row) {
  window.open('https://opsg.in/a/i/' + row.target.parentElement.id, '_blank')
}
