import {
  ICredentialsDecrypted,
  ICredentialTestFunctions,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeCredentialTestResult,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  JsonObject,
  NodeOperationError,
} from 'n8n-workflow'

import bot from './bot'
import {
  connection,
  getChannels as getChannelsHelper,
  getRoles as getRolesHelper,
  ICredentials,
  ipcRequest,
} from './bot/helpers'
import { options } from './Discord.node.options'
import { VoiceManager } from './bot/voice'

// we start the bot if we are in the main process
if (!process.send) bot()

const nodeDescription: INodeTypeDescription = {
  displayName: 'Discord Send',
  name: 'discord',
  group: ['communication'] as any,
  version: 1,
  description: 'Sends messages, embeds and prompts to Discord',
  defaults: {
    name: 'Discord Send',
  },
  icon: 'file:discord.svg',
  inputs: ['main'] as any,
  outputs: ['main'] as any,
  credentials: [
    {
      name: 'discordApi',
      required: true,
      testedBy: 'discordApiTest',
    },
  ],
  properties: options,
}

export interface IDiscordNodeMessageParameters {
  executionId: string
  triggerPlaceholder: boolean
  triggerChannel: boolean
  channelId: string
  embed: boolean
  title: string
  description: string
  url: string
  color: string
  timestamp: string
  footerText: string
  footerIconUrl: string
  imageUrl: string
  thumbnailUrl: string
  authorName: string
  authorIconUrl: string
  authorUrl: string
  fields: {
    field?: {
      name: string
      value: string
      inline: boolean
    }[]
  }
  mentionRoles: string[]
  content: string
  files: {
    file?: {
      url: string
    }[]
  }
}

export interface IDiscordNodePromptParameters {
  executionId: string
  triggerPlaceholder: boolean
  triggerChannel: boolean
  channelId: string
  mentionRoles: string[]
  content: string
  timeout: number
  placeholder: string
  apiKey: string
  baseUrl: string
  buttons: {
    button?: {
      value: string
      label: string
      style: number
    }[]
  }
  select: {
    select?: {
      value: string
      label: string
      description: string
    }[]
  }
  persistent: boolean
  minSelect: number
  maxSelect: number
  updateMessageId: string
}

export interface IDiscordNodeActionParameters {
  executionId: string
  triggerPlaceholder: boolean
  triggerChannel: boolean
  channelId: string
  apiKey: string
  baseUrl: string
  actionType: string
  removeMessagesNumber: number
  userId?: string
  roleUpdateIds?: string[] | string
  auditLogReason: string
}

export class Discord implements INodeType {
  description: INodeTypeDescription = nodeDescription

  methods = {
    loadOptions: {
      async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = (await this.getCredentials('discordApi')) as ICredentials
        return await getChannelsHelper(credentials).catch((e) => {
          throw new NodeOperationError(this.getNode(), e)
        })
      },
      async getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = (await this.getCredentials('discordApi')) as ICredentials
        return await getRolesHelper(credentials).catch((e) => {
          throw new NodeOperationError(this.getNode(), e)
        })
      },
      async getVoiceChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = (await this.getCredentials('discordApi')) as ICredentials
        const channels = await getChannelsHelper(credentials)
        return channels.filter(channel => (channel as any).type === 'voice')
      },
    },
    credentialTest: {
      discordApiTest,
    },
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const executionId = this.getExecutionId()
    const returnData: INodeExecutionData[] = []

    // connection
    const credentials = (await this.getCredentials('discordApi').catch((e) => {
      throw new NodeOperationError(this.getNode(), e)
    })) as unknown as ICredentials
    await connection(credentials).catch((e) => {
      throw new NodeOperationError(this.getNode(), e)
    })

    // execution
    const items: INodeExecutionData[] = this.getInputData()
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const nodeParameters: Record<string, string | number | boolean | object> = {}
      Object.keys(this.getNode().parameters).forEach((key) => {
        nodeParameters[key] = this.getNodeParameter(key, itemIndex, '') as string | number | boolean | object
      })
      nodeParameters.executionId = executionId
      nodeParameters.apiKey = credentials.apiKey
      nodeParameters.baseUrl = credentials.baseUrl
      nodeParameters.auditLogReason = this.getNodeParameter('auditLogReason', itemIndex, '') as string

      if (nodeParameters.type === 'voice') {
        const voiceAction = this.getNodeParameter('voiceAction', itemIndex) as string
        const guildId = this.getNodeParameter('guildId', itemIndex) as string

        switch (voiceAction) {
          case 'join': {
            const channelId = this.getNodeParameter('voiceChannelId', itemIndex) as string
            await VoiceManager.joinChannel(guildId, channelId, credentials.guild)
            break
          }
          case 'leave': {
            await VoiceManager.leaveChannel(guildId)
            break
          }
          case 'play': {
            const channelId = this.getNodeParameter('voiceChannelId', itemIndex) as string
            const audioUrl = this.getNodeParameter('audioUrl', itemIndex) as string
            await VoiceManager.joinChannel(guildId, channelId, credentials.guild)
            await VoiceManager.playAudio(guildId, audioUrl)
            break
          }
          case 'stop': {
            await VoiceManager.stopAudio(guildId)
            break
          }
        }
      } else if (nodeParameters.channelId || nodeParameters.executionId) {
        // return the interaction result if there is one
        const res = await ipcRequest(
          `send:${
            ['select', 'button'].includes(nodeParameters.type as string)
              ? 'prompt'
              : nodeParameters.type === 'none'
                ? 'action'
                : nodeParameters.type
          }`,
          nodeParameters,
        ).catch((e) => {
          handleExecutionError.call(this, e, itemIndex, returnData)
        })

        if (res) {
          returnData.push(createReturnData(res))
        }
      }

      if (nodeParameters.placeholder) await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return this.prepareOutputData(returnData)
  }
}

function handleExecutionError(this: IExecuteFunctions, e: Error, itemIndex: number, returnData: INodeExecutionData[]) {
  if (this.continueOnFail()) {
    returnData.push({
      json: this.getInputData(itemIndex)[0].json,
      error: new NodeOperationError(this.getNode(), e),
      pairedItem: itemIndex,
    })
  } else {
    throw new NodeOperationError(this.getNode(), e, {
      itemIndex,
    })
  }
}

function createReturnData(res: {
  value?: string
  channelId?: string
  userId?: string
  userName?: string
  userTag?: string
  messageId?: string
  action?: string
}): INodeExecutionData {
  return {
    json: {
      value: res?.value,
      channelId: res?.channelId,
      userId: res?.userId,
      userName: res?.userName,
      userTag: res?.userTag,
      messageId: res?.messageId,
      action: res?.action,
    },
  }
}

async function discordApiTest(
  this: ICredentialTestFunctions,
  credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
  const requestOptions = {
    method: 'GET',
    uri: 'https://discord.com/api/v10/oauth2/@me',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'DiscordBot (https://www.discord.com, 1)',
      Authorization: `Bot ${credential.data?.token}`,
    },
    json: true,
  }

  try {
    await this.helpers.request(requestOptions)
  } catch (error) {
    return {
      status: 'Error',
      message: `Connection details not valid: ${(error as JsonObject).message}`,
    }
  }
  return {
    status: 'OK',
    message: 'Authentication successful!',
  }
}
