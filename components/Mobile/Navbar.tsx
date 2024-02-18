import { IconPlus } from '@tabler/icons-react';
import { FC } from 'react';

import { Conversation } from '@/types/chat';
import { popupalert2 } from '../Chat/Chat';



interface Props {
  selectedConversation: Conversation;
  onNewConversation: () => void;
}

export const Navbar: FC<Props> = ({
  selectedConversation,
  onNewConversation,
}) => {
  return (
    <nav className="flex w-full justify-between bg-[#202123] py-3 px-4">
      <div className="mr-4"></div>

      <div className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">
        {/* {selectedConversation.name} */}
            
            <div className='dropdown_option dropdown_option_nav' id='dropdown_option_id' style={{display:'flex' , marginLeft:'5px' , width:'fit-content', padding:'5px' , marginTop:'10px' , borderRadius:'5px' }}  onClick={popupalert2} >              
               <div className='text_chatgpt' >
                 <h3 style={{fontWeight:'bold'}}>ChatGPT 3.5</h3>
               </div>   
               <div className='text_chatgpt' style={{color:'#999999'}}>
                 <svg width="16" height="17" viewBox="0 0 16 17" fill="none" className="text-token-text-tertiary">
                   <path d="M11.3346 7.83203L8.00131 11.1654L4.66797 7.83203" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
               </div>
            </div>     
      </div>
              
        <div className='text_chatgpt' style={{color:'#999999'}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md"><path fill-rule="evenodd" clip-rule="evenodd"
              d="M16.7929 2.79289C18.0118 1.57394 19.9882 1.57394 21.2071 2.79289C22.4261 4.01184 22.4261 5.98815 21.2071 7.20711L12.7071 15.7071C12.5196 15.8946 12.2652 16 
              12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.29289 11.2929L16.7929 2.79289ZM19.7929 4.20711C19.355 3.7692 18.645 3.7692 18.2071 4.2071L10 12.4142V14H11.5858L19.7929
              5.79289C20.2308 5.35499 20.2308 4.64501 19.7929 4.20711ZM6 5C5.44772 5 5 5.44771 5 6V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V14C19 13.4477 19.4477 13 20 13C20.5523
              13 21 13.4477 21 14V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34314 4.34315 3 6 3H10C10.5523 3 11 3.44771 11 4C11 4.55228 10.5523 5 10 5H6Z" fill="white">
              </path>
          </svg>
        </div>

      {/* <IconPlus
        className="cursor-pointer hover:text-neutral-400 " onClick={onNewConversation}
      /> */}
    </nav>

  
  );
};

