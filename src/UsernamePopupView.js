export default function UsernamePopupView() {
    this.usernamePopup = document.getElementById('username-popup');
    this.initPopup();
}

UsernamePopupView.prototype.initPopup = function() {
    (function(self) {
        var cancelBtn = document.getElementById('username-cancel-btn');
        cancelBtn.addEventListener('click', function() {
            self.hide();
        })
    })(this)

    this.submitBtn = document.getElementById('username-submit-btn');
    this.input = document.getElementById('username-input');
};

UsernamePopupView.prototype.show = function () {
    this.usernamePopup.classList.remove('inactive');
};

UsernamePopupView.prototype.hide = function() {
    this.usernamePopup.classList.add('inactive');
};
