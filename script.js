let sched;

$.getJSON("sched.json", function (data) {
    sched = data;
    $(function() {
        class_update_loop();
    });
});

function class_update_loop() {
    let sched_info = get_sched_info();
    if (sched_info.activity !== undefined) {
        $("#activity").text(sched_info.activity[0]);
        timer_update_loop(sched_info);
    }
}

function timer_update_loop(sched_info) {
    let current_date = new Date();
    let midnight = new Date().setHours(0, 0, 0, 0);
    let end_date = new Date(midnight + (sched_info.activity[2] * 1000));
    let ends_in_sec = Math.ceil((end_date - current_date) / 1000);
    if (ends_in_sec <= 0) {
        class_update_loop();
        $("#timer").text();
        return;
    } else if (ends_in_sec < 60) {
        $("#timer").text(ends_in_sec + " seconds left");
    } else if (ends_in_sec < 3600) {
        $("#timer").text(Math.ceil((ends_in_sec / 60)) + " minutes left");
    } else if (ends_in_sec <= 86400) {
        let hours_left = Math.ceil(ends_in_sec / 3600);
        let minutes_left = Math.ceil((ends_in_sec % 3600) / 60);
        if (minutes_left > 0) {
            $("#timer").text(hours_left + " hour and " + minutes_left + " minutes left");
        } else {
            $("#timer").text(hours_left + " hours left");
        }
    }
    setTimeout(function() {timer_update_loop(sched_info)}, 1000);
}

function get_sched_info() {
    let date = new Date();
    let day_of_year = dayOfYear(date);
    let week_of_year = date.getWeek();
    let seconds_since_midnight = getSecondsSinceMidnight(date);
    let during_year = true;
    let activity;
    let week;
    let day;
    // Check if school in ongoing
    if (sched["active_epoch_range"][0] <= Date.now() / 1000 <= sched["active_epoch_range"][1]) {
        // Check if the day is a special day off
        if (!(day_of_year in sched["day_off_exclusions"])) {
            // Checks if week is a non default week and set the correct week
            if (week_of_year in sched["default_week_exclusions"]) {
                week = sched["weeks"][sched["default_week_exclusions"][week_of_year]];
            } else {
                week = sched["weeks"]["default"];
            }
            // gets the current day of the week
            day = sched["days"][week[date.getDay()]];
            // gets current hour, if any
            for (let hour of day) {
                if (hour[1] <= seconds_since_midnight && seconds_since_midnight <= hour[2]) {
                    activity = hour;
                    break;
                }
            }
        }
    } else {
        //If not during school year
        during_year = false;
    }
    return {
        during_year: during_year,
        activity: activity
    };
}

dayOfYear = date => Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

function getSecondsSinceMidnight(d) {
    let e = new Date(d);
    e.setHours(0,0,0,0);
    return Math.floor((d - e)/1000);
}

Date.prototype.getWeek = function() {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
        - 3 + (week1.getDay() + 6) % 7) / 7);
}
