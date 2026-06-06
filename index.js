const { Client, IntentsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.DirectMessages,
  ],
});

const config = require('./config.json');

// Veri dosyaları
const dataDir = './data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const ticketsFile = path.join(dataDir, 'tickets.json');
const worklogFile = path.join(dataDir, 'worklog.json');
const logsFile = path.join(dataDir, 'logs.json');

// Veri yükleme fonksiyonları
function loadData(file) {
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return {};
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

let tickets = loadData(ticketsFile);
let worklog = loadData(worklogFile);
let logs = loadData(logsFile);

// Bot hazır
client.on('ready', () => {
  console.log(`✅ Bot hazır: ${client.user.tag}`);
  client.user.setActivity('7/24 Hizmet', { type: 'WATCHING' });

  // Ses kanalını bul ve bot'u bağla
  const guild = client.guilds.cache.get(config.guildId);
  if (guild) {
    const voiceChannel = guild.channels.cache.get(config.voiceChannelId);
    if (voiceChannel && voiceChannel.isVoiceBased()) {
      voiceChannel.join().catch(err => {
        console.error('Ses kanalına bağlanılamadı:', err);
        // İlk başta hata verirse tekrar dene
        setTimeout(() => voiceChannel.join().catch(console.error), 5000);
      });
    }
  }
});

// Kullanıcı sese girdiğinde
client.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.member.user.bot) return;

  // Sese girdiyse
  if (!oldState.channelId && newState.channelId) {
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('👋 Selamünalekeyküm!')
      .setDescription(`Hoşgeldin ${newState.member.user.username}!\n\nSunucumuza ve sesli sohbetimize hoş geldin. Keyifli sohbetler!`)
      .setTimestamp();

    newState.guild.systemChannel?.send({ embeds: [embed] }).catch(console.error);
  }
});

// Komut işleme
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Ticket paneli oluştur
  if (command === 'ticket-panel') {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('❌ Admin izni gerekli!');
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('open_ticket')
          .setLabel('🎫 Ticket Aç')
          .setStyle(ButtonStyle.Primary)
      );

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎫 Ticket Sistemi')
      .setDescription('Yardım için butona tıklayın ve ticket açın!')
      .setTimestamp();

    message.channel.send({ embeds: [embed], components: [row] });
    message.delete();
  }

  // Mesai giriş
  if (command === 'giriş') {
    const userId = message.author.id;
    const now = new Date().toLocaleString('tr-TR');

    if (!worklog[userId]) worklog[userId] = [];
    worklog[userId].push({ giriş: now, çıkış: null });
    saveData(worklogFile, worklog);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Mesai Giriş')
      .setDescription(`${message.author.username} mesaiye girdi!\n⏰ Saat: ${now}`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logAction(message.guild.id, `${message.author.username} mesaiye girdi - ${now}`);
  }

  // Mesai çıkış
  if (command === 'çıkış') {
    const userId = message.author.id;
    const now = new Date().toLocaleString('tr-TR');

    if (!worklog[userId] || worklog[userId].length === 0) {
      return message.reply('❌ Önce giriş yapmalısınız!');
    }

    const lastEntry = worklog[userId][worklog[userId].length - 1];
    lastEntry.çıkış = now;
    saveData(worklogFile, worklog);

    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Mesai Çıkış')
      .setDescription(`${message.author.username} mesaiden çıktı!\n⏰ Saat: ${now}`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
    logAction(message.guild.id, `${message.author.username} mesaiden çıktı - ${now}`);
  }

  // Mesai raporu
  if (command === 'rapor') {
    const userId = message.author.id;

    if (!worklog[userId] || worklog[userId].length === 0) {
      return message.reply('❌ Hiç mesai kaydınız yok!');
    }

    let description = '';
    worklog[userId].forEach((entry, i) => {
      description += `\n**${i + 1}.** Giriş: ${entry.giriş}\nÇıkış: ${entry.çıkış || 'Devam ediyor...'}\n`;
    });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Mesai Raporu')
      .setDescription(description)
      .setFooter({ text: `Kullanıcı: ${message.author.username}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }

  // Log kanal oluştur
  if (command === 'create-logs') {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('❌ Admin izni gerekli!');
    }

    const category = await message.guild.channels.create({
      name: '📋 LOG KANALLARı',
      type: ChannelType.GuildCategory,
    });

    const logChannels = [
      'ticket-logs', 'mesai-logs', 'moderation-logs', 'voice-logs',
      'message-logs', 'member-logs', 'role-logs', 'channel-logs',
      'ban-logs', 'kick-logs', 'warn-logs', 'mute-logs',
      'unmute-logs', 'embed-logs', 'reaction-logs', 'invite-logs',
      'voice-move-logs', 'nick-logs', 'boost-logs', 'server-logs'
    ];

    for (const channelName of logChannels) {
      await message.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
      });
    }

    message.reply('✅ 20 Log kanalı oluşturuldu!');
  }
});

// Button tıklaması
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_ticket') {
      // Dropdown menüsü göster
      const row = new ActionRowBuilder()
        .addComponents(
          new SelectMenuBuilder()
            .setCustomId('ticket_category')
            .setPlaceholder('Konu seç...')
            .addOptions(
              { label: '🆘 Teknik Destek', value: 'support', emoji: '🆘' },
              { label: '🐛 Bug Raporu', value: 'bug', emoji: '🐛' },
              { label: '💡 Özellik İsteği', value: 'feature', emoji: '💡' },
              { label: '📢 Duyuru', value: 'announcement', emoji: '📢' },
              { label: '⚠️ Şikayet', value: 'complaint', emoji: '⚠️' }
            )
        );

      interaction.reply({ content: 'Konu seçin:', components: [row], ephemeral: true });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'ticket_category') {
      const category = interaction.values[0];
      const userId = interaction.user.id;
      const ticketId = Math.random().toString(36).substr(2, 9).toUpperCase();

      // Ticket kanalı oluştur
      const guild = interaction.guild;
      const ticketChannel = await guild.channels.create({
        name: `ticket-${ticketId}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ['ViewChannel'],
          },
          {
            id: userId,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
          {
            id: config.staffRoleId,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
        ],
      });

      // Ticket bilgisi kaydet
      if (!tickets[guild.id]) tickets[guild.id] = [];
      tickets[guild.id].push({
        id: ticketId,
        userId: userId,
        category: category,
        channelId: ticketChannel.id,
        createdAt: new Date().toLocaleString('tr-TR'),
        closed: false,
      });
      saveData(ticketsFile, tickets);

      // Embed gönder
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎫 Ticket: ${ticketId}`)
        .setDescription(`**Konu:** ${category}\n**Açan:** ${interaction.user.username}\n**Durum:** Açık`)
        .setTimestamp();

      const closeButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('❌ Kapat')
            .setStyle(ButtonStyle.Danger)
        );

      await ticketChannel.send({ embeds: [embed], components: [closeButton] });

      interaction.reply({ content: `✅ Ticket oluşturuldu: <#${ticketChannel.id}>`, ephemeral: true });
      logAction(guild.id, `Yeni ticket açıldı: ${ticketId} - Konu: ${category}`);
    }
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    const channelName = interaction.channel.name;
    const ticketId = channelName.replace('ticket-', '').toUpperCase();

    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🎫 Ticket Kapatıldı')
      .setDescription(`Ticket ID: ${ticketId}\n**Kapatan:** ${interaction.user.username}`)
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });
    
    logAction(interaction.guild.id, `Ticket kapatıldı: ${ticketId}`);

    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 3000);
  }
});

// Log fonksiyonu
function logAction(guildId, action) {
  if (!logs[guildId]) logs[guildId] = [];
  logs[guildId].push({
    timestamp: new Date().toLocaleString('tr-TR'),
    action: action,
  });
  saveData(logsFile, logs);

  // Maksimum 1000 log tutmak için
  if (logs[guildId].length > 1000) {
    logs[guildId].shift();
    saveData(logsFile, logs);
  }
}

client.login(config.token);
