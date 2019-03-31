socket = io();

socket.on('connect', function() {
  console.log('Connected to server');
})

socket.on('disconnect', function() {
  console.log('Disconnected from server');
})

$('#routeForm').submit(function(){
    let formData = {
      origin: $('#origin').val(),
      destination: $('#destination').val()
    }

    socket.emit('route', formData);
    document.getElementById('origin').value = '';
    document.getElementById('destination').value = '';
    //socket.emit('message', "Input");
    //$('#Input').val('');
    return false;
  });

socket.on('session', function(data) {
  console.log(data);
})
