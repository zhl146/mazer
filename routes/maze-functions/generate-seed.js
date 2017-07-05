function generateSeedFromDate() {
    var today = new Date();
    console.log(today.getFullYear() + '/' + today.getMonth() + '/' + today.getDay());
}

module.exports = generateSeedFromDate();