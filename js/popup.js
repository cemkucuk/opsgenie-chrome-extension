chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'session') {
        return renderAlerts()
    }
});

(async () => {
    await renderAlerts()
})()

async function renderAlerts() {
    const elemAlerts = document.getElementById("alerts")
    const elemInfo = document.getElementById("info-text")
    const {settings, popup} = await chrome.storage.session.get(['settings', 'popup'])

    console.log(settings, popup)

    if (!popup) {
        elemInfo.innerHTML = `<p style="color:#BF2600">Loading ...</p>`
        elemAlerts.innerHTML = ''
        return
    }

    if (!popup.ok) {
        elemInfo.innerHTML = `<p style="color:#BF2600">${popup.response}</p>`
        elemAlerts.innerHTML = ''
        return
    }

    elemInfo.innerHTML = `<i>Last updated @ ${popup.time}</i><a style="float: right;" href="${popup.ogUrl}" target="_blank"> see all alerts↗</a>`
    if (popup.data.length === 0) {
        elemInfo.innerHTML += "<p style=\"text-align:center\"> There are no alerts.  🎉</p>"
        elemAlerts.innerHTML = ''
        return
    }

    popup.data.forEach(function (alert, i) {
        let alertRow = `<div class="alert" id="${alert.id}"><span class="alert-action">`
        if (settings.ackUser) {
            alertRow += `<a href="#" id="${alert.id}-ack">[ACK]</a>`
        }
        alertRow += `</span><span class="alert-count">x${alert.count}</span><span class="alert-priority ${alert.priority}-bg">${alert.priority}</span><span class="alert-message">${alert.message}</span></div>`

        elemAlerts.insertAdjacentHTML('beforeend', alertRow)
        if (settings.ackUser) {
            document.getElementById(`${alert.id}-ack`).addEventListener('click', (e) => {
                e.preventDefault()

                chrome.runtime.sendMessage({
                    action: 'ack',
                    id: alert.id
                }, (error) => {
                    console.log(error)
                    if (error) {
                        window.alert(error)
                    }
                })
            })
        }
        document.getElementById(alert.id).addEventListener('click', (e) => {
            e.preventDefault()
            return

            let url = "https://"
            if (settings.customerName !== '') {
                url += `${settings.customerName}.`
            }
            url += `app.opsgenie.com/alert/detail/${alert.id}/details`

            window.open(url, '_blank')
        })
    })
}
