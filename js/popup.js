chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'session') {
        return renderAlerts()
    }
});

(async () => {
    await renderAlerts()
})()

async function renderAlerts() {
    const elemAlerts = document.querySelector("#alerts > table")
    const elemInfo = document.getElementById("info-text")
    const settings = await chrome.storage.sync.get()
    const {popup} = await chrome.storage.session.get('popup')
    elemAlerts.innerHTML = ''

    if (!popup) {
        elemInfo.innerHTML = `<p style="color:#BF2600">Loading ...</p>`
        return
    }

    if (!popup.ok) {
        elemInfo.innerHTML = `<p style="color:#BF2600">${popup.data}</p>`
        return
    }

    elemInfo.innerHTML = `<i>Last updated @ ${popup.time}</i><a style="float: right;" href="${popup.ogUrl}" target="_blank"> see all alerts↗</a>`
    if (popup.data.length === 0) {
        elemInfo.innerHTML += "<p style=\"text-align:center\"> There are no alerts.  🎉</p>"
        return
    }


    popup.data.forEach(function (alert, i) {
        let alertRow = `<tr class="alert" id="${alert.id}"><td class="alert-action">`
        if (settings.ackUser) {
            alertRow += `<a href="#" id="${alert.id}-ack">[ACK]</a>`
        }
        alertRow += `</td><td class="alert-count">x${alert.count}</td><td><span class="alert-priority ${alert.priority}-bg">${alert.priority}</span></td><td class="alert-message">${alert.message}</td></tr>`

        elemAlerts.insertAdjacentHTML('beforeend', alertRow)
        if (settings.ackUser) {
            document.getElementById(`${alert.id}-ack`).addEventListener('click', (e) => {
                e.preventDefault()

                chrome.runtime.sendMessage({
                    action: 'ack',
                    id: alert.id
                }, (error) => {
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
