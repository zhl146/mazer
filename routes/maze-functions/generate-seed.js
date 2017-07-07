export default function generateSeed() {
    var today = new Date();
    var yearString = '' + today.getFullYear();

    var month = today.getMonth();
    var monthString = (month < 10? '0' : '') + month;

    var day = today.getDay();
    var dayString = (day < 10? '0' : '') + day;

    return yearString + monthString + dayString;
};
