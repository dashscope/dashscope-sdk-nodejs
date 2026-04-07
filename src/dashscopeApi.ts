import Configuration from './configuration';
import Generation from './aigc/generation';
import ChatCompletion from './aigc/chatCompletion';
import ImageSynthesis from './aigc/imageSynthesis';
import VideoSynthesis from './aigc/videoSynthesis';
import MultiModalConversation from './aigc/multimodalConversation';
import CodeGeneration from './aigc/codeGeneration';
import File from './file';
import Models from './models';
import Deployments from './deployments';
import Assistants from './assistants';
import Threads from './threads';
import Messages from './threads/messages';
import Runs from './threads/runs';
import {
  ListOptions, MessageListOptions, FileUploadOptions, GenerateOptions, FineTuneOptions,
  TranscriptionOptions, TextEmbeddingOptions, ChatCompletionOptions, ModelsListOptions,
  ImageSynthesisOptions, VideoSynthesisOptions, MultiModalConversationOptions, CodeGenerationOptions,
  BatchTextEmbeddingOptions, MultiModalEmbeddingOptions, UnderstandingOptions, TextReRankOptions,
  DeploymentOptions, AssistantCreateOptions,
  ThreadCreateOptions, MessageCreateOptions, RunCreateOptions,
} from './types';
import FineTune from './finetune';
import Transcription from './audio/asr/transcription';
import TextEmbedding from './embeddings/text-embedding';
import BatchTextEmbedding from './embeddings/batchTextEmbedding';
import MultiModalEmbedding from './embeddings/multimodalEmbedding';
import Understanding from './nlp/understanding';
import TextReRank from './rerank/textRerank';

class DashscopeApi {

  private configuration: Configuration;

  constructor(configuration: Configuration) {
    this.configuration = configuration;
  }

  createGeneration(options: GenerateOptions) {
    return new Generation(this.configuration).call(options);
  }

  createChatCompletion(options: ChatCompletionOptions) {
    return new ChatCompletion(this.configuration).create(options);
  }

  createImageSynthesis(options: ImageSynthesisOptions) {
    return new ImageSynthesis(this.configuration).call(options);
  }

  createVideoSynthesis(options: VideoSynthesisOptions) {
    return new VideoSynthesis(this.configuration).call(options);
  }

  createMultiModalConversation(options: MultiModalConversationOptions) {
    return new MultiModalConversation(this.configuration).call(options);
  }

  createCodeGeneration(options: CodeGenerationOptions) {
    return new CodeGeneration(this.configuration).call(options);
  }

  listModels(options?: ModelsListOptions) {
    return new Models(this.configuration).list(options || {});
  }

  getModel(name: string) {
    return new Models(this.configuration).get(name);
  }

  createDeployment(options: DeploymentOptions) {
    return new Deployments(this.configuration).call(options);
  }

  listDeployments(options?: ListOptions) {
    return new Deployments(this.configuration).list(options || {});
  }

  getDeployment(id: string) {
    return new Deployments(this.configuration).get(id);
  }

  deleteDeployment(id: string) {
    return new Deployments(this.configuration).delete(id);
  }

  scaleDeployment(deployedModel: string, capacity: number) {
    return new Deployments(this.configuration).scale(deployedModel, capacity);
  }

  createAssistant(options: AssistantCreateOptions) {
    return new Assistants(this.configuration).call(options);
  }

  listAssistants(options?: ListOptions) {
    return new Assistants(this.configuration).list(options || {});
  }

  getAssistant(id: string) {
    return new Assistants(this.configuration).get(id);
  }

  updateAssistant(id: string, data: Record<string, unknown>) {
    return new Assistants(this.configuration).update(id, data);
  }

  deleteAssistant(id: string) {
    return new Assistants(this.configuration).delete(id);
  }

  createThread(options?: ThreadCreateOptions) {
    return new Threads(this.configuration).create(options || {});
  }

  getThread(id: string) {
    return new Threads(this.configuration).get(id);
  }

  createMessage(threadId: string, options: MessageCreateOptions) {
    return new Messages(this.configuration).create(threadId, options);
  }

  listMessages(threadId: string, options?: MessageListOptions) {
    return new Messages(this.configuration).list(threadId, options || {});
  }

  createRun(threadId: string, options: RunCreateOptions) {
    return new Runs(this.configuration).create(threadId, options);
  }

  getRun(threadId: string, runId: string) {
    return new Runs(this.configuration).get(threadId, runId);
  }

  listFiles(options?: ListOptions) {
    return new File(this.configuration).list(options || {});
  }

  /** Fetch file metadata by id. */
  getFile(fileId: string) {
    return new File(this.configuration).fetch(fileId);
  }

  /** Upload a file for fine-tuning or assistants. */
  uploadFile(options: FileUploadOptions) {
    return new File(this.configuration).upload(options);
  }

  /** Delete a file by id. */
  deleteFile(fileId: string) {
    return new File(this.configuration).delete(fileId);
  }

  /** Create a fine-tuning job. */
  createFineTune(options: FineTuneOptions) {
    return new FineTune(this.configuration).call(options);
  }

  /** List fine-tuning jobs. */
  listFineTunes(options: ListOptions) {
    return new FineTune(this.configuration).list(options);
  }

  /** Get fine-tuning job details. */
  getFineTune(jobId: string) {
    return new FineTune(this.configuration).fetch(jobId);
  }

  /** Cancel a fine-tuning job. */
  cancelFineTune(jobId: string) {
    return new FineTune(this.configuration).cancel(jobId);
  }

  /** List events for a fine-tuning job. */
  listFineTuneEvents(jobId: string) {
    return new FineTune(this.configuration).events(jobId);
  }

  /** Delete a fine-tuning job. */
  deleteFineTune(jobId: string) {
    return new FineTune(this.configuration).delete(jobId);
  }

  /** Submit an async speech transcription job. */
  createTranscription(options: TranscriptionOptions) {
    return new Transcription(this.configuration).call(options);
  }

  createEmbedding(options: TextEmbeddingOptions) {
    return new TextEmbedding(this.configuration).call(options);
  }

  createBatchEmbedding(options: BatchTextEmbeddingOptions) {
    return new BatchTextEmbedding(this.configuration).call(options);
  }

  createMultiModalEmbedding(options: MultiModalEmbeddingOptions) {
    return new MultiModalEmbedding(this.configuration).call(options);
  }

  createUnderstanding(options: UnderstandingOptions) {
    return new Understanding(this.configuration).call(options);
  }

  createTextReRank(options: TextReRankOptions) {
    return new TextReRank(this.configuration).call(options);
  }
}

export default DashscopeApi;
