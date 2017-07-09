export default function UsernamePopupView(backgroundColor) {
    this.usernamePopup = document.getElementById('username-popup');
    this.backgroundColor = backgroundColor;
    this.initPopup();
}

UsernamePopupView.prototype.initPopup = function() {
    var cancelBtn = document.getElementById('username-cancel-btn');
    cancelBtn.addEventListener('click', function() {
        this.hide();
    }.bind(this));

    var usernamePopupBody = this.usernamePopup.firstElementChild;
    usernamePopupBody.style.backgroundColor = this.backgroundColor;

    this.submitBtn = document.getElementById('username-submit-btn');
    this.input = document.getElementById('username-input');
};

UsernamePopupView.prototype.show = function () {
    this.usernamePopup.classList.remove('inactive');
};

UsernamePopupView.prototype.hide = function() {
    this.usernamePopup.classList.add('inactive');
};
