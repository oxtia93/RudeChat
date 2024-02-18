import Image from 'next/image';
import { relative } from 'path';

function MyImg() {
  return (
    <div>
      {/* Use the `src` prop to specify the path to your image */}
      <Image
        src="/icons.png" // Path to your image in the public directory
        alt="My Image"
        width={45} // Width of the displayed image
        height={45} // Height of the displayed image

        style={ { position:'absolute' , left:'40px' , bottom:'20px'}}
        
      />
    </div>
  );
}

export default MyImg;
