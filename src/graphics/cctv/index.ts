/**
 * @graphics/cctv: procedurally drawn facility video (Canvas 2D). See README.md.
 */
export { buildScene, sceneKindFor, presetScene, hashId, mulberry } from './scene';
export type { Scene, SceneKind, SceneSpec, CameraKind, DoorSlot, Lane } from './scene';
export { passersAt, passagesBetween, passageInSlot, pick } from './people';
export type { Passer, ActivityParams } from './people';
export { renderFrame, renderBlank, drawPicture, compress, drawOsd, poseFor, grey } from './render';
export type { FrameInput, FrameView, LightMode, TrainView, Osd, Quality } from './render';
export { projectPoint, projectPoly, toCamera, clipNear } from './project';
export type { V3, CamPose } from './project';
