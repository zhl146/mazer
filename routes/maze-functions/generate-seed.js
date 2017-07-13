
export default function SeedUtil() {
}

SeedUtil.dateToSeed = function(date) {
    var yearString = '' + date.getFullYear();

    var month = date.getMonth() + 1;
    var monthString = (month < 10? '0' : '') + month;

    var day = date.getDate();
    var dayString = (day < 10? '0' : '') + day;
    console.log(date, day, dayString);

    return yearString + monthString + dayString;
};

SeedUtil.seedToDate = function(seed) {
    if (seed.length !== 8) {
        return null;
    }

    var yearString = seed.substring(0, 4);
    var monthString = seed.substring(4, 6);
    var dayString = seed.substring(6, 8);

    var year = Number.parseInt(yearString);
    var month = Number.parseInt(monthString)-1;
    var day = Number.parseInt(dayString);

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        return null;
    }

    return new Date(year, month, day);
}
