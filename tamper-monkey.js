// ==UserScript==
// @name         csuna visa
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically log in and book appointments on ais.usvisa-info.com
// @match        https://ais.usvisa-info.com/*/niv/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const email = 'xxxxx';
    const pwd = 'xxxx';
    const start = 'xxxxx';
    const end = 'xxxxx';
    const exclude = ['2025-04-01', '2025-04-02'];
    const locationId = 95;
    const country = 'ca';
    const intervalSecond = 40;

    const delay = (s) => new Promise((r) => setTimeout(r, s * 1000));
    const reload = async (s) => (await delay(s), location.reload());

    const ajaxGet = (url, timeout) =>
        $.ajax({ url, type: 'GET', timeout }).fail((jq, x, e) => {
            if (jq.status === 401) {
                window.location.href = `/en-${country}/niv/users/sign_in`;
            } else {
                console.error(e);
                log(`Ajax error on ${url}: ${x}`);
            }
        });

    const getTime = () => new Date().toLocaleTimeString();

    const showToast = (msg, duration = 3000) => {
        const toast = Object.assign(document.createElement('div'), {
            textContent: msg,
            style: 'position:fixed;bottom:60%;left:50%;transform:translateX(-50%);background:rgba(0, 0, 0, 0.7);color:white;padding:10px 20px;border-radius:5px;z-index:10000',
        });
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.5s';
            toast.style.opacity = 0;
            setTimeout(() => toast.remove(), 500);
        }, duration);
    };

    const log = (msg) => {
        const container = $('#log_container');
        if (!container.length) return;
        if (container.find('div').length > 60) container.empty();
        container.append(`<div>${getTime()} ${msg}</div>`);
        container[0].scrollTop = container[0].scrollHeight;
    };

    const waitForElm = (selector, timeout = 10000) => new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const observer = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) {
                observer.disconnect();
                resolve(found);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
            observer.disconnect();
            reject(`Timeout: ${selector} not found`);
        }, timeout);
    });

    const login = async () => {
        showToast('Auto Login...');
        await delay(3);

        const checkbox = $('#policy_confirmed');
        if (checkbox.length && !checkbox.prop('checked')) {
            checkbox.prop('checked', true).trigger('change');
        }

        $('#user_email').val(email);
        $('#user_password').val(pwd);
        $('[name=commit]').trigger('click');

        await delay(2);

        const popup = $('.ui-dialog.infoPopUp:visible');
        if (popup.length) {
            const alertText = popup.find('.alert').text().trim();
            if (alertText.includes('sign in or sign up')) {
                showToast('Detected sign-in popup. Clicking OK...');
                popup.find('button:contains("OK")').trigger('click');
                return;
            }
        }

        const error = $('#sign_in_form .error').text().trim();
        if (error.includes('Invalid email or password')) {
            showToast(error);
        } else {
            reload(10);
        }
    };

    const doJob = async () => {
        try {
            const daysUrl = `appointment/days/${locationId}.json?appointments[expedite]=false`;
            const dayData = await ajaxGet(daysUrl, 4500);
            if (!dayData) return;

            const days = dayData.map(({ date }) => date);
            log(days.length > 0 ? 'Earliest date: ' + days[0] : 'No available dates');

            const suitable = days.filter(d => d >= start && d <= end && !exclude.includes(d));
            if (!suitable.length) return;

            const date = suitable[0];
            const timesUrl = `appointment/times/${locationId}.json?appointments[expedite]=false&date=${date}`;
            const timeData = await ajaxGet(timesUrl, 4500);
            if (!timeData || !timeData.available_times.length) {
                log('No available times');
                return;
            }

            const time = timeData.available_times[0];
            $('#appointments_consulate_appointment_facility_id').val(locationId);
            $('#appointments_consulate_appointment_date').val(date);
            $('#appointments_consulate_appointment_time').empty().append(new Option(time, time)).val(time);
            $('#appointment-form').trigger('submit');
        } catch (e) {
            log(e.toString());
        }
    };

    const route = async () => {
        const u = window.location.href;
        if (document.title === 'Under construction (503)') return await reload(10);
        else if (u.endsWith('niv/users/sign_in')) return await login();
        else if (u.includes('niv/groups/')) {
            showToast('Looking for Continue button...');
            await delay(2);
            for (let i = 0; i < 10; i++) {
                const btn = $("a.button.primary.small[href*='continue_actions']");
                if (btn.length) {
                    showToast('Found Continue. Redirecting...');
                    await delay(1);
                    location.href = btn.attr('href').replace('continue_actions', 'appointment');
                    return;
                }
                await delay(1);
            }
            showToast('Continue button not found.');
        } else if (u.includes('/appointment')) {
            showToast('Preparing appointment page...');
            try {
                await waitForElm('#appointments_consulate_appointment_facility_id');
                $('#appointments_consulate_appointment_facility_id').val(locationId);
                $('#consulate_date_time').show();
                $('#appointments_consulate_appointment_date').removeAttr('readonly');
                $('#appointments_submit').removeAttr('disabled');

                $('body').append(`<div id='log_container' style='position:fixed; bottom:10px; right:10px; width:300px; height:200px; background:#fff; border:1px solid #ccc; overflow:auto; z-index:100000; padding:10px'></div>`);
                log(`Desired Range: [${start} to ${end}], exclude: [${exclude}], interval: ${intervalSecond}s`);

                await delay(5);
                doJob();
                setInterval(doJob, intervalSecond * 1000);
            } catch (e) {
                console.warn('Failed to initialize appointment page:', e);
            }
        } else {
            showToast('Not a supported page.');
        }
    };

    $('.emergency-announcement').hide();
    route();
})();
