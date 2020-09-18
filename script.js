let sched;
let notifications_on;
let sound_notifications_on;

// initialize audio object
ding_audio = new Audio("Ding-sound-effect.mp3");

$.getJSON("sched.json", function (data) {
    sched = data;
    $(function() {
        // start update loop
        class_update_loop();

        // set notifications bool according to switch
        notifications_on = $("#notifySwitch").prop("checked");
        sound_notifications_on = $("#soundSwitch").prop("checked");

        $("#gear").click(function() {
            $("#settings").modal("show");
        });

        $("#notifySwitch").change(function () {
            if (this.checked) {
                // Check if perms are granted for notifications, if they aren't request permission
                if (Notification.permission !== "granted") {
                    Notification.requestPermission();
                }
                notifications_on = true;
            } else {
                // Notifications are turned off
                notifications_on = false;
            }
        });

        $("#soundSwitch").change(function () {
            sound_notifications_on = this.checked;
        });

    });
});

function class_update_loop() {
    let sched_info = get_sched_info();
    if (sched_info.activity !== undefined) {
        // If there's an ongoing activity
        $("body").animate({backgroundColor: sched_info.activity[3]}, 1000);
        $("#activity").text(sched_info.activity[0]);
        timer_update_loop(sched_info.activity[2]);
        if (sound_notifications_on)
            ding_audio.play();
        if (notifications_on)
            new Notification(sched_info.activity[0] + " started");
    } else if (sched_info.next_activity !== undefined) {
        // if there's a next activity and no ongoing activity
        $("body").animate({backgroundColor: sched["no_activity_color"]}, 1000);
        $("#activity").text(sched_info.next_activity[0] + " starting in");
        timer_update_loop(sched_info.next_activity[1], false);
    } else {
        // if there's no next activity and no ongoing activity
        $("body").animate({backgroundColor: sched["no_activity_color"]}, 1000);
        $("#activity").text("No current class!");
        setTimeout(class_update_loop, 10000);
    }
}

function timer_update_loop(to_time, add_left=true) {
    let current_date = new Date();
    let midnight = new Date().setHours(0, 0, 0, 0);
    let end_date = new Date(midnight + (to_time * 1000));
    let ends_in_sec = Math.ceil((end_date - current_date) / 1000);
    let timer_str = "";
    if (ends_in_sec <= 0) {
        $("#timer").text('');
        $("#activity").text('');
        class_update_loop();
        return;
    } else if (ends_in_sec < 60) {
        timer_str = ends_in_sec + " seconds";
    } else if (ends_in_sec < 3600) {
        timer_str = Math.ceil((ends_in_sec / 60)) + " minutes";
    } else if (ends_in_sec <= 86400) {
        let hours_left = Math.floor(ends_in_sec / 3600);
        let minutes_left = Math.ceil((ends_in_sec % 3600) / 60);
        if (minutes_left === 60) {
            timer_str = (hours_left + 1) + " hours";
        } else if (minutes_left > 0) {
            timer_str = hours_left + " hour and " + minutes_left + " minutes";
        } else {
            timer_str = hours_left + " hours";
        }
    }
    if (add_left) {timer_str += " left"}
    $("#timer").text(timer_str);
    setTimeout(function() {timer_update_loop(to_time, add_left)}, 1000);
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
    let next_activity;
    // Check if school is ongoing
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
            for (const entry of day) {
                if (entry[1] <= seconds_since_midnight && seconds_since_midnight <= entry[2]) {
                    activity = entry;
                    break;
                }
            }
            // find next nearest activity of the day
            let temp_activity = ["temp", 1000000];
            for (const entry of day) {
                if (entry[1] > seconds_since_midnight && temp_activity[1] > entry[1]) {
                    temp_activity = entry;
                    next_activity = entry;
                }
            }
        }
    } else {
        //If not during school year
        during_year = false;
    }
    return {
        during_year: during_year,
        activity: activity,
        next_activity: next_activity
    };
}

dayOfYear = date => Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

function getSecondsSinceMidnight(d) {
    let e = new Date(d);
    e.setHours(0,0,0,0);
    return Math.ceil((d - e)/1000);
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
