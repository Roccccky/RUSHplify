import { BlockArt } from "./block-art";

/** The picture of a block: always RUSHplify's own pictogram. The pedal's built-in block pictures are not
 *  loaded (they are the manufacturer's artwork). */
export function BlockPicture({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return <BlockArt name={name} size={size} className={className}/>;
}
