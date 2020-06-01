import os

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)
channel_id = ['General']
channels = {}
channels['General'] = []

@app.route("/")
def index():
    return render_template('index.html')

@socketio.on("textSubmit")
def textSubmit(data):
    channel = data['currentChannel']
    username = data['username']
    message = data['text']
    type = data["type"]
    if len(channels[channel]) == 100:
        channels[channel].pop(0)
    channels[channel].append({"text":message,"username":username,
                                "type":type})
    #need to pop after length == 100
    emit("showText",data,broadcast=True)


@socketio.on('createChannelReq')
def createChannelReq(data):
    if(data['channelName'] in channel_id):
        return
    channel_id.append(data['channelName'])
    channels[data['channelName']] = []
    emit("createChannel",data,broadcast=True)

@app.route('/requestchannels', methods = ['GET'])
def requestChannels():
    return jsonify({'success':True, 'channels':channel_id})

@app.route('/changechannel',methods = ['POST'])
def changeChannel():
    channelName = request.form.get("channelName")
    return jsonify({"success":True, 'message':channels[channelName]})


@app.route('/uploadfile',methods = ['POST'])
def uploadFile():
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save('static/'+filename)
    return jsonify({"success":True, "message":filename})

@app.route('/downloadfile', methods=['POST'])
def downloadFile():
    filename = request.form.get('filename')
    return send_from_directory('static',filename, as_attachment=True)
