import BaseApi from '../../common/baseApi';
import { waitForTask } from '../../common/asyncTask';
import { ImageSynthesisOptions } from '../../types';

function getImageTask(task: string | undefined, model: string): string {
  if (task) return task;
  if (model) {
    const m = model.toLowerCase();
    if (m.includes('imageedit') || m.includes('wan2.5-i2i')) return 'image2image';
  }
  return 'text2image';
}

class ImageSynthesis extends BaseApi {

  protected service = 'services/aigc/text2image/image-synthesis';

  protected getService(task?: string): string {
    const t = task ?? 'text2image';
    return `services/aigc/${t}/image-synthesis`;
  }

  async asyncCall(options: ImageSynthesisOptions) {
    const {
      model, prompt, negative_prompt, images, sketch_image_url, ref_img,
      mask_image_url, base_image_url, extra_input, task, function: fn,
      ...rest
    } = options;
    if (!model) throw new Error('model parameter is required for image synthesis');
    if (!prompt) throw new Error('prompt parameter is required for image synthesis');
    const resolvedTask = getImageTask(task, model);
    const input: Record<string, unknown> = { prompt };
    if (negative_prompt) input.negative_prompt = negative_prompt;
    if (images?.length) input.images = images;
    if (sketch_image_url) input.sketch_image_url = sketch_image_url;
    if (ref_img) input.ref_img = ref_img;
    if (mask_image_url) input.mask_image_url = mask_image_url;
    if (base_image_url) input.base_image_url = base_image_url;
    if (fn) input.function = fn;
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

  async call(options: ImageSynthesisOptions) {
    const createResult = await this.asyncCall(options);
    return waitForTask(createResult, (taskId) => this.fetch(taskId));
  }
}

export default ImageSynthesis;
