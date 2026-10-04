import Peer from 'peerjs';

export const Network = {
    peer: null,
    connections: [],
    isHost: false,
    id: null,
    onJoin: null,
    onData: null,

    host(onReady) {
        this.isHost = true;
        this.peer = new Peer();
        this.peer.on('open', (id) => {
            this.id = id;
            if (onReady) onReady(id);
        });

        this.peer.on('connection', (conn) => {
            this.connections.push(conn);
            conn.on('data', (data) => {
                if (this.onData) this.onData(conn.peer, data);
            });
            conn.on('open', () => {
                if (this.onJoin) this.onJoin(conn.peer);
            });
            conn.on('close', () => {
                this.connections = this.connections.filter(c => c !== conn);
            });
        });
    },

    join(hostId, onReady) {
        this.isHost = false;
        this.peer = new Peer();
        this.peer.on('open', (id) => {
            this.id = id;
            const conn = this.peer.connect(hostId);
            this.connections.push(conn);
            conn.on('open', () => {
                if (onReady) onReady(id);
            });
            conn.on('data', (data) => {
                if (this.onData) this.onData(hostId, data);
            });
            conn.on('error', (err) => {
                console.error('Peer connection error:', err);
                alert('Erro ao conectar ao servidor.');
            });
        });
    },

    broadcast(data) {
        this.connections.forEach(conn => conn.send(data));
    },

    sendToHost(data) {
        if (this.connections.length > 0) {
            this.connections[0].send(data);
        }
    }
};
