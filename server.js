const WebSocket = require('ws');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const fs = require('fs');

// Tạo signal server bằng WebSocket
const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  let peerConnection;
  const rtpPort = 5004;

  // Khi nhận SDP offer từ client
  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    if (data.type === 'offer') {
      peerConnection = new RTCPeerConnection();

      // Nhận SDP từ client
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      
      // Tạo SDP answer và gửi lại client
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      ws.send(JSON.stringify(peerConnection.localDescription));

      // Lắng nghe khi client yêu cầu track
      const videoTrack = peerConnection.addTransceiver('video').receiver.track;

      // Nhận luồng RTP từ ffmpeg
      const rtpStream = fs.createReadStream(`rtp://${rtpPort}`);

      // Truyền dữ liệu RTP tới client
      rtpStream.on('data', (chunk) => {
        videoTrack.write(chunk);
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    peerConnection && peerConnection.close();
  });
});

console.log('Signal server is running on ws://localhost:3000');
