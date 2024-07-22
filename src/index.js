require('dotenv').config();

var express = require('express');
var bodyParser = require('body-parser');
const mongoose = require('mongoose')
const cors = require('cors')
const { usersRoutes, postersRoutes } = require('./routes/routes')

var port = process.env.PORT || 3525;
const databaseUrl = process.env.DATABASE_URL
const baseUrl = process.env.BASE_URL
var app = express();
app.use(cors())

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(usersRoutes)
app.use(postersRoutes)

mongoose.connect(databaseUrl, {

}).then(() => {
  console.log('Conexión con base de datos exitosa');
}).catch((e) => {
  console.log('ERROR: No es posible conectarse con la base de datos, valide que el servicio de mongo este arriba ' + e);
})

mongoose.connection.on('connected', () => {
  console.log('Conexión con MongoDB establecida');
});

mongoose.connection.on('error', (err) => {
  console.error('Error de conexión con MongoDB:', err);
});

app.listen(port, function(){
	console.log(`Server running in ${baseUrl}:${port}`);
});