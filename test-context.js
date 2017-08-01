var context = require.context('./spec/shared', true, /.spec\.js$/);
context.keys().forEach(context);