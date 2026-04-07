import BaseApi from '../../common/baseApi';
import { waitForTask } from '../../common/asyncTask';
import { VideoSynthesisOptions } from '../../types';

/** Media type labels for `media` items (aligned with Python `VideoSynthesis.MediaType`). */
export const VideoSynthesisMediaType = {
  FIRST_FRAME: 'first_frame',
  LAST_FRAME: 'last_frame',
  REFERENCE_IMAGE: 'reference_image',
  REFERENCE_VIDEO: 'reference_video',
  REFERENCE_VOICE: 'reference_voice',
  VIDEO: 'video',
  FIRST_CLIP: 'first_clip',
  DRIVING_AUDIO: 'driving_audio',
} as const;

function getVideoTask(task: string | undefined, model: string): string {
  if (task) return task;
  if (model?.toLowerCase().includes('kf2v')) return 'image2video';
  return 'video-generation';
}

class VideoSynthesis extends BaseApi {

  protected service = 'services/aigc/video-generation/video-synthesis';

  protected getService(task?: string): string {
    const t = task ?? 'video-generation';
    return `services/aigc/${t}/video-synthesis`;
  }

  async asyncCall(options: VideoSynthesisOptions) {
    const {
      model, prompt, negative_prompt, img_url, audio_url,
      reference_video_urls, reference_urls, reference_url, reference_video_description,
      extend_prompt = true, template, extra_input, task,
      head_frame, tail_frame, first_frame_url, last_frame_url,
      media,
      ...rest
    } = options;
    const resolvedTask = getVideoTask(task, model);
    const input: Record<string, unknown> = { prompt: prompt ?? '', extend_prompt };
    if (negative_prompt) input.negative_prompt = negative_prompt;
    if (template) input.template = template;
    if (img_url) input.img_url = img_url;
    if (audio_url) input.audio_url = audio_url;
    if (reference_video_urls?.length) input.reference_video_urls = reference_video_urls;
    if (reference_urls?.length) input.reference_urls = reference_urls;
    if (reference_url) input.reference_url = reference_url;
    if (reference_video_description?.length) input.reference_video_description = reference_video_description;
    if (head_frame) input.head_frame = head_frame;
    if (tail_frame) input.tail_frame = tail_frame;
    if (first_frame_url !== undefined && first_frame_url !== null) input.first_frame_url = first_frame_url;
    if (last_frame_url !== undefined && last_frame_url !== null) input.last_frame_url = last_frame_url;
    if (media?.length) input.media = media;
    if (extra_input && Object.keys(extra_input).length > 0) Object.assign(input, extra_input);
    const parameters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) parameters[k] = v;
    }
    const result = await this.request({
      method: 'post',
      service: this.getService(resolvedTask),
      headers: { 'X-DashScope-Async': 'enable' },
      data: { model, input, parameters },
    });
    return result.data;
  }

  async fetch(taskId: string) {
    const result = await this.request({
      service: 'tasks',
      api: taskId,
      method: 'get',
      headers: { 'X-DashScope-Async': 'enable' },
    });
    return result.data;
  }

  async call(options: VideoSynthesisOptions) {
    const createResult = await this.asyncCall(options);
    return waitForTask(createResult, (taskId) => this.fetch(taskId));
  }
}

export default VideoSynthesis;
