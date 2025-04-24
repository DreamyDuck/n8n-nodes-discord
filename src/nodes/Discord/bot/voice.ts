import { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnection } from '@discordjs/voice';
import { Guild, VoiceChannel } from 'discord.js';
import ytdl from 'ytdl-core';

export class VoiceManager {
    private static connections: Map<string, VoiceConnection> = new Map();
    private static players: Map<string, any> = new Map();

    static async joinChannel(guildId: string, channelId: string, guild: Guild): Promise<VoiceConnection> {
        const channel = await guild.channels.fetch(channelId) as VoiceChannel;
        if (!channel) throw new Error('Channel not found');

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        this.connections.set(guildId, connection);
        return connection;
    }

    static async leaveChannel(guildId: string): Promise<void> {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
            this.players.delete(guildId);
        }
    }

    static async playAudio(guildId: string, url: string): Promise<void> {
        const connection = this.connections.get(guildId);
        if (!connection) throw new Error('Not connected to voice channel');

        const player = createAudioPlayer();
        const stream = ytdl(url, { filter: 'audioonly' });
        const resource = createAudioResource(stream);

        player.play(resource);
        connection.subscribe(player);

        this.players.set(guildId, player);
    }

    static async stopAudio(guildId: string): Promise<void> {
        const player = this.players.get(guildId);
        if (player) {
            player.stop();
            this.players.delete(guildId);
        }
    }
} 