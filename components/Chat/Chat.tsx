

import { IconClearAll, IconSettings } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { getEndpoint } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

// import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import MyImg from '../imgs/MyImg';

import 'material-icons/iconfont/material-icons.css'

import { Navbar } from '../Mobile/Navbar';




interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}




export const popupalert2  = () => {
  const element1 = document.getElementById('popup1_ids1');

  // Check if the element exists
  if (element1) {
    // Toggle the display property
    if (element1.style.display === 'none' || element1.style.display === '') {
      element1.style.display = 'block';
    } else {
      element1.style.display = 'none';
    }
  }
};




export const togglePopup1 = () => {
  const elementxy = document.getElementById('dropdown_option_id');
// Check if the element exists and hide it
  if (elementxy) {
    elementxy.style.background = '#292929';
    elementxy.style.cursor = 'pointer';

};
}


export const togglePopup2 = () => {
  const elementxy = document.getElementById('dropdown_option_id');
// Check if the element exists and hide it
  if (elementxy) {
    elementxy.style.background = '#171717';
};
}










export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      conversations,
      models,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0, plugin: Plugin | null = null) => {
      if (selectedConversation) {
        let updatedConversation: Conversation;
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message],
          };
        } else {
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
        }
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });
        const chatBody: ChatBody = {
          model: updatedConversation.model,
          messages: updatedConversation.messages,
          key: apiKey,
          prompt: updatedConversation.prompt,
          temperature: updatedConversation.temperature,
        };
        const endpoint = getEndpoint(plugin);
        let body;
        if (!plugin) {
          body = JSON.stringify(chatBody);
        } else {
          body = JSON.stringify({
            ...chatBody,
            googleAPIKey: pluginKeys
              .find((key) => key.pluginId === 'google-search')
              ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
            googleCSEId: pluginKeys
              .find((key) => key.pluginId === 'google-search')
              ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
          });
        }
        const controller = new AbortController();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body,
        });
        if (!response.ok) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          toast.error(response.statusText);
          return;
        }
        const data = response.body;
        if (!data) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          return;
        }
        if (!plugin) {
          if (updatedConversation.messages.length === 1) {
            const { content } = message;
            const customName =
              content.length > 30 ? content.substring(0, 30) + '...' : content;
            updatedConversation = {
              ...updatedConversation,
              name: customName,
            };
          }
          homeDispatch({ field: 'loading', value: false });
          const reader = data.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let isFirst = true;
          let text = '';
          while (!done) {
            if (stopConversationRef.current === true) {
              controller.abort();
              done = true;
              break;
            }
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);
            text += chunkValue;
            if (isFirst) {
              isFirst = false;
              const updatedMessages: Message[] = [
                ...updatedConversation.messages,
                { role: 'assistant', content: chunkValue },
              ];
              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages,
              };
              homeDispatch({
                field: 'selectedConversation',
                value: updatedConversation,
              });
            } else {
              const updatedMessages: Message[] =
                updatedConversation.messages.map((message, index) => {
                  if (index === updatedConversation.messages.length - 1) {
                    return {
                      ...message,
                      content: text,
                    };
                  }
                  return message;
                });
              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages,
              };
              homeDispatch({
                field: 'selectedConversation',
                value: updatedConversation,
              });
            }
          }
          saveConversation(updatedConversation);
          const updatedConversations: Conversation[] = conversations.map(
            (conversation) => {
              if (conversation.id === selectedConversation.id) {
                return updatedConversation;
              }
              return conversation;
            },
          );
          if (updatedConversations.length === 0) {
            updatedConversations.push(updatedConversation);
          }
          homeDispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);
          homeDispatch({ field: 'messageIsStreaming', value: false });
        } else {
          const { answer } = await response.json();
          const updatedMessages: Message[] = [
            ...updatedConversation.messages,
            { role: 'assistant', content: answer },
          ];
          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages,
          };
          homeDispatch({
            field: 'selectedConversation',
            value: updateConversation,
          });
          saveConversation(updatedConversation);
          const updatedConversations: Conversation[] = conversations.map(
            (conversation) => {
              if (conversation.id === selectedConversation.id) {
                return updatedConversation;
              }
              return conversation;
            },
          );
          if (updatedConversations.length === 0) {
            updatedConversations.push(updatedConversation);
          }
          homeDispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
        }
      }
    },
    [
      apiKey,
      conversations,
      pluginKeys,
      homeDispatch,
      selectedConversation,
      stopConversationRef,
    ],
  );

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };




  // CUSTOM JS CODE - DYNAMICALLY CHANGE CONTENTS OF BOTTOM LIST CONTENTS OF THE CHAT AREA   - START 


useEffect(() => {

    // First Tab 
  const wordDisplayElement = document.getElementById('hibro');
  if (wordDisplayElement) {
    const wordsArray = ['Give me ideas', 'Make up a story', 'Suggest fun activities', 'Compare marketing strategies' ,'Help me debug'];
    const randomIndex = Math.floor(Math.random() * wordsArray.length);
    const randomWord = wordsArray[randomIndex];
    wordDisplayElement.innerHTML = randomWord;
  }

  const wordDisplayElement1 = document.getElementById('hibro1');
  if (wordDisplayElement1) {
    const wordsArray1 = ['for what to do with my kids', 'about Sharky, a tooth-brushing shark superhero', 'for a family of 4 to do indoors on a rainy day', 'for sunglasses for Gen Z and Millennials' , 'a linked list problem'];
    const randomIndex1 = Math.floor(Math.random() * wordsArray1.length);
    const randomWord1 = wordsArray1[randomIndex1];
    wordDisplayElement1.innerHTML = randomWord1;
  }
 
    // Second Tab 
    const wordDisplayElement2 = document.getElementById('hibro2');
    if (wordDisplayElement2) {
      const wordsArray2 = ['Explain options trading', 'Come up with concepts', 'Recommend a dish', 'Recommend a dish' , 'Explain this code:'];
      const randomIndex2 = Math.floor(Math.random() * wordsArray2.length);
      const randomWord2 = wordsArray2[randomIndex2];
      wordDisplayElement2.innerHTML = randomWord2;
    }
  
    const wordDisplayElement3 = document.getElementById('hibro3');
    if (wordDisplayElement3) {
      const wordsArray3 = ['if I am familiar with buying and selling stocks', 'for a retro-style arcade game', 'to impress a date who is a picky eater', 'to bring to a potluck' , 'cat config.yaml | awk NF'];
      const randomIndex3 = Math.floor(Math.random() * wordsArray3.length);
      const randomWord3 = wordsArray3[randomIndex3];
      wordDisplayElement3.innerHTML = randomWord3;
    }




    
    // Third Tab 
    const wordDisplayElement4 = document.getElementById('hibro4');
    if (wordDisplayElement4) {
      const wordsArray4 = ['Help me pick', 'Plan a trip', 'Plan an itinerary', 'Explain options trading' , 'Compare marketing strategies'];
      const randomIndex4 = Math.floor(Math.random() * wordsArray4.length);
      const randomWord4 = wordsArray4[randomIndex4];
      wordDisplayElement4.innerHTML = randomWord4;
    }
  
    const wordDisplayElement5 = document.getElementById('hibro5');
    if (wordDisplayElement5) {
      const wordsArray5 = ['a birthday gift for my mom who likes gardening', 'to experience Seoul like a local', 'to experience the wildlife in the Australian outback', 'if I am familiar with buying and selling stocks' , 'for sunglasses for Gen Z and Millennials'];
      const randomIndex5 = Math.floor(Math.random() * wordsArray5.length);
      const randomWord5 = wordsArray5[randomIndex5];
      wordDisplayElement5.innerHTML = randomWord5;
    }





    
    // fourth Tab 
    const wordDisplayElement6 = document.getElementById('hibro6');
    if (wordDisplayElement6) {
      const wordsArray6 = ['Plan a trip', 'Create a content calendar', 'Give me ideas', 'Help me pick' , 'Show me a code snippet'];
      const randomIndex6 = Math.floor(Math.random() * wordsArray6.length);
      const randomWord6 = wordsArray6[randomIndex6];
      wordDisplayElement6.innerHTML = randomWord6;
    }
  
    const wordDisplayElement7 = document.getElementById('hibro7');
    if (wordDisplayElement7) {
      const wordsArray7 = ['to explore the rock formations in Cappadocia', 'for a TikTok account', 'for what to do with my kids art', 'an outfit that will look good on camera' , 'of a websites sticky header'];
      const randomIndex7 = Math.floor(Math.random() * wordsArray7.length);
      const randomWord7 = wordsArray7[randomIndex7];
      wordDisplayElement7.innerHTML = randomWord7;
    }


}, []);

  // CUSTOM JS CODE - DYNAMICALLY CHANGE CONTENTS OF BOTTOM LIST CONTENTS OF THE CHAT AREA   - END

 //=======================================================================================================================================



   // CUSTOM JS CODE - TOP TWO TOGGLE POPUPS   - START

  //First popup

  const popupalert1 = () => {
    const element1 = document.getElementById('popup1_ids');
  // Check if the element exists and hide it
    if (element1) {
      element1.style.display = 'block';
    }
  };

  const togglePopup = () => {
    const element1 = document.getElementById('popup1_ids');
  // Check if the element exists and hide it
    if (element1) {

      element1.style.display = 'none';

      // setTimeout(function(){
      //   element1.style.display = 'none';
      // }, 1000);
    }  
  };


  //second popup

  // const popupalert2 = () => {
  //   const element1 = document.getElementById('popup1_ids1');
  // // Check if the element exists and hide it
  //   if (element1) {
  //     element1.style.display = 'block';
  //   } 
  // };


  // export const popupalert2  = () => {
  //   const element1 = document.getElementById('popup1_ids1');
  
  //   // Check if the element exists
  //   if (element1) {
  //     // Toggle the display property
  //     if (element1.style.display === 'none' || element1.style.display === '') {
  //       element1.style.display = 'block';
  //     } else {
  //       element1.style.display = 'none';
  //     }
  //   }
  // };




  // export const togglePopup1 = () => {
  //   const elementxy = document.getElementById('dropdown_option_id');
  // // Check if the element exists and hide it
  //   if (elementxy) {
  //     elementxy.style.background = '#292929';
  //     elementxy.style.cursor = 'pointer';

  // };
  // }

  
  // export const togglePopup2 = () => {
  //   const elementxy = document.getElementById('dropdown_option_id');
  // // Check if the element exists and hide it
  //   if (elementxy) {
  //     elementxy.style.background = '#343541';
  // };
  // }
  




  


  // const togglePopup1 = () => {
  //   const element11 = document.getElementById('popup1_ids1');
  // // Check if the element exists and hide it
  //   if (element11) {
  //     element11.style.display = 'none';

  //     // setTimeout(function(){
  //     //   element11.style.display = 'none';
  //     // }, 1000);
     
  //   }  
  // };


   // CUSTOM JS CODE - TOP TWO TOGGLE POPUPS   - END

   //==================================================================================================================================




// End - Custom functions for chatgpt (show and hide popup alerts )

// const overlay_hide = () => {
//   const element12 = document.getElementById('overlay_top');
// // Check if the element exists and hide it
//   if (element12) {
//     element12.style.display = 'block';
   
//   }  
// };





  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  // useEffect(() => {
  //   console.log('currentMessage', currentMessage);
  //   if (currentMessage) {
  //     handleSend(currentMessage);
  //     homeDispatch({ field: 'currentMessage', value: undefined });
  //   }
  // }, [currentMessage]);


  
const side_popup1 = () => {
  const element1 = document.getElementById('side_popup_id1');
// Check if the element exists and hide it
  if (element1) {
   
    if(element1.style.display=="none")
    {
      element1.style.display = 'block';
    }
    else if(element1.style.display=="block")
    {
      element1.style.display = 'none';

    }

  }  
};



  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);




  //overlay setting
const overlay_open_pemium = () => {
  const element12 = document.getElementById('overlay_top');
  const element13 = document.getElementById('setting_section_cover_premium');
  const element1 = document.getElementById('side_popup_id');
// Check if the element exists and hide it
  if (element12 && element13 && element1) {
    element12.style.display = 'block';
    element13.style.display = 'block';
    element1.style.display = 'none';
   
  }  
};

  return (
    <div className="relative flex-1 overflow-auto bg-white" id='body_style' style={{background:'#171717'}}>
      {!(apiKey || serverSideApiKeyIsSet) ? (
        <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
          <div className="text-center text-4xl font-bold text-black dark:text-white">
            Welcome to chatGPT
          </div>
          <div className="text-center text-lg text-black dark:text-white">
            <div className="mb-8">{`Chatbot UI is an open source clone of OpenAI's ChatGPT UI.`}</div>
            <div className="mb-2 font-bold">
              Important: Chatbot UI is 100% unaffiliated with OpenAI.
            </div>
          </div>
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="mb-2">
              Chatbot UI allows you to plug in your API key to use this UI with
              their API.
            </div>
            <div className="mb-2">
              It is <span className="italic">only</span> used to communicate
              with their API.
            </div>
            <div className="mb-2">
              {t(
                'Please set your OpenAI API key in the bottom left of the sidebar.',
              )}
            </div>
            <div>
              {t("If you don't have an OpenAI API key, you can get one here: ")}
              <a
                href="https://platform.openai.com/account/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                openai.com
              </a>
            </div>
          </div>
        </div>
      ) : modelError ? (
        <ErrorMessageDiv error={modelError} />
      ) : (
        <>
          <div
            className="max-h-full "
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {selectedConversation?.messages.length === 0 ? (
              <>


              
              <div className='dropdown_option dropdown_option_main' id='dropdown_option_id' style={{display:'flex' ,
               marginLeft:'32px' , width:'fit-content', padding:'5px' , marginTop:'3px' , borderRadius:'5px' }}  onClick={popupalert2} onMouseMove={togglePopup1} onMouseOut={togglePopup2}>
               
                <div className='text_chatgpt' >
                  <h3 style={{fontWeight:'bold'}}>ChatGPT 3.5</h3>
                </div>   
                <div className='text_chatgpt' style={{color:'#999999'}}>
                  <svg width="16" height="17" viewBox="0 0 16 17" fill="none" className="text-token-text-tertiary">
                    <path d="M11.3346 7.83203L8.00131 11.1654L4.66797 7.83203" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                  </div>
                </div>

                <div className="popup1" id="popup1_ids1" style={{ display:'none' , position:'absolute'}}>
                    
                      <div className="class1 popup_1"  style={{ margin: '13px', flexDirection: 'column' , background:'#202123'  , borderColor:'#202123'  }}>
                       
                        <div className='popup-top-section' style={{display:'flex',flexDirection:'row' , alignItems:'center' }}>
                            <div className='popup-top-section-icon'>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md"><path fill-rule="evenodd" clip-rule="evenodd" 
                                  d="M15.2406 3.48592C15.2405 3.48652 15.2403 3.48713 15.2402 3.48773L14.1838 8.00525H20.0071C21.7333 8.00525 22.6031 10.0263 21.5255 11.3049L21.5232 11.3076L12.2148 
                                  22.2732C12.2144 22.2737 12.214 22.2743 12.2135 22.2748C10.8154 23.9308 8.29078 22.4977 8.75937 20.5141C8.75951 20.5135 8.75965 20.5129 8.75979 20.5123L9.81614 
                                  15.9948H3.99288C2.26668 15.9948 1.39687 13.9737 2.47446 12.6951L2.47674 12.6924L11.7851 1.7268C11.7856 1.72628 11.786 1.72577 11.7864 1.72526C13.1845 0.0691769 
                                  15.7092 1.50223 15.2406 3.48592ZM13.2906 3.04211L11.9496 8.77683C11.8802 9.07364 11.9503 9.38587 12.14 9.62465C12.3297 9.86343 12.6182 10.0026 12.9234
                                  10.0026H19.9972C19.9985 10.0058 19.9993 10.0088 19.9997 10.0113C19.9998 10.0118 19.9998 10.0123 19.9999 10.0127C19.9991 10.0139 19.9979 10.0156 19.9959
                                  10.018C19.9957 10.0182 19.9956 10.0184 19.9954 10.0187L10.7094 20.9579L12.0504 15.2232C12.1198 14.9264 12.0497 14.6141 11.86 14.3754C11.6703 14.1366 
                                  11.3818 13.9974 11.0766 13.9974H4.00279C4.0015 13.9942 4.00069 13.9912 4.00029 13.9887C4.0002 13.9882 4.00013 13.9877 4.00009 13.9873C4.00083 13.9861
                                  4.00209 13.9844 4.00407 13.982C4.00424 13.9818 4.00442 13.9816 4.00459 13.9813L13.2906 3.04211Z" fill="currentColor"></path></svg>
                              </div>
                            <div className='popup-top-section-icon' style={{paddingLeft:'20px' , paddingRight:'70px'}}>
                                <p className="textcolor2" style={{ color:'white'}}>OXTIA GPT-3.5</p>
                                <p className="textcolor2">Great for everyday tasks</p>
                            </div>

                            <div className='popup-top-section-icon'>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md flex-shrink-0"><path fill-rule="evenodd"
                                clip-rule="evenodd" d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10ZM14.0755
                                5.93219C14.5272 6.25003 14.6356 6.87383 14.3178 7.32549L9.56781 14.0755C9.39314 14.3237 9.11519 14.4792 8.81226 14.4981C8.50934 14.517 8.21422 14.3973 
                                8.01006 14.1727L5.51006 11.4227C5.13855 11.014 5.16867 10.3816 5.57733 10.0101C5.98598 9.63855 6.61843 9.66867 6.98994 10.0773L8.65042 11.9039L12.6822
                                6.17451C13 5.72284 13.6238 5.61436 14.0755 5.93219Z" fill="currentColor"></path></svg>

                            {/* <svg width="20" id='popup-top-section-icon_id' height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md flex-shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" 
                            d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 
                            15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z" fill="currentColor" opacity="0.16"></path></svg> */}
                            </div>
                        </div><br></br>


                        <div className='popup-top-section' style={{display:'flex',flexDirection:'row' , alignItems:'center' }}>
                            <div className='popup-top-section-icon'>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md shrink-0"><path d="M19.3975 1.35498C19.3746 1.15293 19.2037 
                                  1.00021 19.0004 1C18.7971 0.999793 18.6259 1.15217 18.6026 1.35417C18.4798 2.41894 18.1627 3.15692 17.6598 3.65983C17.1569 4.16274 16.4189 4.47983 15.3542 4.60264C15.1522 
                                  4.62593 14.9998 4.79707 15 5.00041C15.0002 5.20375 15.1529 5.37457 15.355 5.39746C16.4019 5.51605 17.1562 5.83304 17.6716 6.33906C18.1845 6.84269 18.5078 7.57998 18.6016 
                                  8.63539C18.6199 8.84195 18.7931 9.00023 19.0005 9C19.2078 8.99977 19.3806 8.84109 19.3985 8.6345C19.4883 7.59673 19.8114 6.84328 20.3273 6.32735C20.8433 5.81142 21.5967 
                                  5.48834 22.6345 5.39851C22.8411 5.38063 22.9998 5.20782 23 5.00045C23.0002 4.79308 22.842 4.61992 22.6354 4.60157C21.58 4.50782 20.8427 4.18447 20.3391 3.67157C19.833 
                                  3.15623 19.516 2.40192 19.3975 1.35498Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M11 3C11.4833 3 11.8974 3.34562 11.9839 3.82111C12.4637 
                                  6.46043 13.279 8.23983 14.5196 9.48039C15.7602 10.721 17.5396 11.5363 20.1789 12.0161C20.6544 12.1026 21 12.5167 21 13C21 13.4833 20.6544 13.8974 20.1789 13.9839C17.5396 
                                  14.4637 15.7602 15.279 14.5196 16.5196C13.279 17.7602 12.4637 19.5396 11.9839 22.1789C11.8974 22.6544 11.4833 23 11 23C10.5167 23 10.1026 22.6544 10.0161 22.1789C9.53625
                                  19.5396 8.72096 17.7602 7.48039 16.5196C6.23983 15.279 4.46043 14.4637 1.82111 13.9839C1.34562 13.8974 1 13.4833 1 13C1 12.5167 1.34562 12.1026 1.82111 12.0161C4.46043 
                                  11.5363 6.23983 10.721 7.48039 9.48039C8.72096 8.23983 9.53625 6.46043 10.0161 3.82111C10.1026 3.34562 10.5167 3 11 3ZM5.66618 13C6.9247 13.5226 7.99788 14.2087 8.89461
                                  15.1054C9.79134 16.0021 10.4774 17.0753 11 18.3338C11.5226 17.0753 12.2087 16.0021 13.1054 15.1054C14.0021 14.2087 15.0753 13.5226 16.3338 13C15.0753 12.4774 14.0021 
                                  11.7913 13.1054 10.8946C12.2087 9.99788 11.5226 8.9247 11 7.66618C10.4774 8.9247 9.79134 9.99788 8.89461 10.8946C7.99788 11.7913 6.9247 12.4774 5.66618 13Z" 
                                  fill="currentColor"></path></svg>
                              </div>
                            <div className='popup-top-section-icon'  style={{paddingLeft:'20px' , paddingRight:'8px'}}>
                                <p className="textcolor2" style={{color:'white'}}>GPT-4</p>
                                <p className="textcolor2" style={{fontSize:'12px'}}>Our smartest and most capable model. Includes DALL·E, browsing and more.</p>
                                {/* <button type="button"  style={{background:'#ab68fd' , width:'100%' , padding:'7px' , borderRadius:'5px', fontSize:'12px'}}>Upgrade to Plus</button>  */}
                                    <button type="button"  style={{background:'#ab68fd' , width:'100%' , padding:'7px' , borderRadius:'5px', fontSize:'12px'}}>Upgrade to Plus</button> 
                                {/* onClick={overlay_open_pemium} */}
                            </div>

                            <div className='popup-top-section-icon'>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md flex-shrink-0"><path fill-rule="evenodd" clip-rule="evenodd" 
                            d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 
                            15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10Z" fill="currentColor" opacity="0.16"></path></svg>

                             {/* <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md flex-shrink-0"><path fill-rule="evenodd"
                                clip-rule="evenodd" d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10ZM14.0755
                                5.93219C14.5272 6.25003 14.6356 6.87383 14.3178 7.32549L9.56781 14.0755C9.39314 14.3237 9.11519 14.4792 8.81226 14.4981C8.50934 14.517 8.21422 14.3973 
                                8.01006 14.1727L5.51006 11.4227C5.13855 11.014 5.16867 10.3816 5.57733 10.0101C5.98598 9.63855 6.61843 9.66867 6.98994 10.0773L8.65042 11.9039L12.6822
                                6.17451C13 5.72284 13.6238 5.61436 14.0755 5.93219Z" fill="currentColor"></path></svg> */}

                            </div>
                            
                        </div>
                        {/* <h5 className="textcolor1" style={{marginBottom:'13px'}}>Our most capable model, great for tasks that require creativity and advanced reasoning.</h5>
                        <p className="textcolor2" style={{marginBottom:'13px'}}>Available exclusively to Plus users.</p>
                        <p className="textcolor2" style={{marginBottom:'13px'}}>GPT-4 currently has a cap of 25 messages every 3 hours.</p>
                        <button type="button" onClick={overlay_open_pemium} style={{background:'#ab68fd' , width:'100%' , padding:'10px' , borderRadius:'5px'}}>Upgrade to ChatGPT Plus</button>             */}
                      </div>
                  </div>

             



                <div className="flex flex-col space-y-5 md:space-y-10 px-3 pt-2 md:pt-12 sm:max-w-[600px]" >

                {/* <div className="hii" id='top_tow_section_back' style={{display: 'flex', justifyContent: 'center', border: 'solid', padding: '3px', 
                 width: 'fit-content', margin: '0 auto' , borderColor:'#202123' , background:'#202123' , borderRadius:'15px'}}>
                              
                  <div className="hello" id='top_gp3_button' onMouseMove={popupalert1} onMouseOut={togglePopup} style={{border: 'solid', marginRight: '3px' , background:'#40414f' , borderColor:'#40414f' ,
                      borderRadius:'10px' , paddingLeft:'18px' , paddingRight:'18px' , display:'flex'}}>              
                      
                      <svg xmlns="http://www.w3.org/2000/svg"  style={{marginTop:'6px' , color:'#24c37f'}} viewBox="0 0 16 16" fill="none" className="h-4 w-4 transition-colors text-brand-green" width="16" 
                      height="16" stroke-width="2"><path d="M9.586 1.526A.6.6 0 0 0 8.553 1l-6.8 7.6a.6.6 0 0 0 .447 1h5.258l-1.044 4.874A.6.6 0 0 0 7.447 15l6.8-7.6a.6.6 0 0 0-.447-1H8.542l1.044-4.874Z" 
                      fill="currentColor"></path></svg>
                      <h1 style={{padding:'5px'}}>GPT - 3.5</h1>
                  </div>



                  <div className="hello"  id='top_gp4'   onMouseMove={popupalert2} onMouseOut={togglePopup1} style={{border: 'solid' , borderColor:'#202123' , background:'#202123' , paddingLeft:'18px' , paddingRight:'18px' , display:'flex' , color:'#8e8ea0'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" style={{color:'#8e8ea0' , marginTop:'6px' }} viewBox="0 0 16 16" fill="none" className="h-4 w-4 transition-colors group-hover/button:text-brand-purple"
                        width="16" height="16" stroke-width="2"><path d="M12.784 1.442a.8.8 0 0 0-1.569 0l-.191.953a.8.8 0 0 1-.628.628l-.953.19a.8.8 0 0 0 0 1.57l.953.19a.8.8 0 0 1
                        .628.629l.19.953a.8.8 0 0 0 1.57 0l.19-.953a.8.8 0 0 1 .629-.628l.953-.19a.8.8 0 0 0 0-1.57l-.953-.19a.8.8 0 0 1-.628-.629l-.19-.953h-.002ZM5.559 4.546a.8.8 0 0 0-1.519 
                        0l-.546 1.64a.8.8 0 0 1-.507.507l-1.64.546a.8.8 0 0 0 0 1.519l1.64.547a.8.8 0 0 1 .507.505l.546 1.641a.8.8 0 0 0 1.519 0l.546-1.64a.8.8 0 0 1 .506-.507l1.641-.546a.8.8 
                        0 0 0 0-1.519l-1.64-.546a.8.8 0 0 1-.507-.506L5.56 4.546Zm5.6 6.4a.8.8 0 0 0-1.519 0l-.147.44a.8.8 0 0 1-.505.507l-.441.146a.8.8 0 0 0 0 1.519l.44.146a.8.8 0 0 1 
                        .507.506l.146.441a.8.8 0 0 0 1.519 0l.147-.44a.8.8 0 0 1 .506-.507l.44-.146a.8.8 0 0 0 0-1.519l-.44-.147a.8.8 0 0 1-.507-.505l-.146-.441Z" 
                        fill="currentColor"></path></svg>
                        <h1  style={{padding:'5px'}}>GPT - 4</h1>
                        <svg xmlns="http://www.w3.org/2000/svg"  style={{color:'#8e8ea0' , marginTop:'6px' }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" stroke-width="2" className="h-4 w-4 ml-0.5 h-4 w-4 transition-colors sm:ml-0 
                        group-hover/options:text-gray-500 !text-gray-500 -ml-2 group-hover/button:text-brand-purple"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 
                        3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"></path></svg>
                  </div>

                </div> */}


                <div className="popup1" id="popup1_ids" style={{ display:'none' , position:'absolute'}}>
                  <div className="class1 popup_1"  style={{ margin: '10px', flexDirection: 'column' , background:'#202123'  , borderColor:'#202123'  }}>
                    <h5 className="textcolor1" style={{marginBottom:'13px'}}>Our fastest model, great for most everyday tasks.</h5>
                    <p className="textcolor2">Available to Free and Plus users</p>
                  </div>
                </div>


              


                  <div className="text-center text-3xl font-semibold 
                  text-gray-800 dark:text-gray-100" style={{color:'white' , fontSize:'20px'}}>
                    {models.length === 0 ? (
                      <div>
                        {/* <Spinner size="16px" className="mx-auto" /> */}
                      </div>
                    ) : (
                      // 'ChatGPT'
                      <div className='chat_main_section'>
                        <img src='https://oxtia.com/openai/images/chatgpt.png' width="30px"></img>
                      <div className='chat_main_text'>How can I help you today?</div>
                      </div>
                    )}
                  </div>

                  {/* {models.length > 0 && (
                    <div id='model_set' className="flex h-full flex-col space-y-4 rounded-lg 
                    border border-neutral-200 p-4 dark:border-neutral-600"
                    }}>
                    
                    
                        <h1>Hello worl</h1>
                     
                    </div>
                  )} */}
                </div>
              </>
            ) : (
              <>
                {/* <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
                  {t('Model')}: {selectedConversation?.model.name} | {t('Temp')}
                  : {selectedConversation?.temperature} |
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={handleSettings}
                  >
                    <IconSettings size={18} />
                  </button>
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={onClearAll}
                  >
                    <IconClearAll size={18} />
                  </button>
                </div> */}
                {showSettings && (
                  <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                    <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                      <ModelSelect />
                    </div>
                  </div>
                )}

                {selectedConversation?.messages.map((message, index) => (
                  <MemoizedChatMessage
                    key={index}
                    message={message}
                    messageIndex={index}
                    onEdit={(editedMessage) => {
                      setCurrentMessage(editedMessage);
                      // discard edited message and the ones that come after then resend
                      handleSend(
                        editedMessage,
                        selectedConversation?.messages.length - index,
                      );
                    }}
                  />
                ))}

                {loading && <ChatLoader />}

                <div className="h-[162px] bg-white dark:bg-[#171717]" ref={messagesEndRef} 
                />
              </>
            )}
          </div>


          {/* <div  style="display: flex; flex-direction: column; align-items: center;">
            <div class="class1" style="margin: 10px;">Content 1</div>
            <div class="class2" style="margin: 10px;">Content 2</div>
          </div> */}

          {/* <div className="bottom_section" style={{display:'flex' , flexDirection:'column' , alignItems:'center'}}>
             <div className="class1" style={{margin:'10px'}}>Content 1</div>
             <div className="class2" style={{margin:'10px'}}>Content 1</div>
          </div> */}







        <div className="bottom_main" id="bottom_main_id" style={{position:'inherit' , zIndex:'9' , top:'195px'}}>
            <div className="bottom_section"  style={{ display: 'flex', flexDirection: 'column' , alignItems:"center"}}>
          
            <div className="class1 class11" id='bottom_list_1' style={{ margin: '10px', display: 'flex',  flexDirection: 'column' }}>
                <h5 className="textcolor1" id="hibro">Brainstorm names</h5>
                <p className="textcolor2" id="hibro1">for an orange cat we are adopting from the shelter</p>
            </div>

            <div className="class1 class11" id='bottom_list_2' style={{ margin: '10px', display: 'flex', flexDirection: 'column'}}>
                <h5 className="textcolor1" id="hibro2">Make a content strategy</h5>
                <p className="textcolor2" id="hibro3">for a newsletter featuring free local weekend events</p>
            </div>
          </div>

            <div className="bottom_section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="class1 class11" id='bottom_list_3'  style={{ margin: '10px', display: 'flex', flexDirection: 'column'}}>
                <h5 className="textcolor1" id="hibro4">Compare storytelling techniques</h5>
                <p className="textcolor2" id="hibro5">in novels and in films</p>
              </div>
              <div className="class1 class11" id='bottom_list_4' style={{ margin: '10px', display: 'flex', flexDirection: 'column'}}>
                <h5 className="textcolor1" id="hibro6">Help me study</h5>
                <p className="textcolor2" id="hibro7">vocabulary for a college entrance exam</p>
              </div>
            </div>

        </div>


   
         <div className="side_settings" id='side_popup_id1' style={{display:'none', width:'auto' 
         , right:'1%',zIndex:'9' ,bottom:'9%'}}>
             
               <a href="" className="setting1" target="_blank">
                  <p style={{fontSize:'11px' , color:'#8d8d8d'}}>oxtiajailbreak@gmail.com</p>
                </a>
             
             
                <a href="https://help.openai.com/en/collections/3742473-chatgpt" className="setting1" target="_blank">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                   stroke-linejoin="round" className="icon-sm icons_position" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9">
                  </polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <h1>Help & FAQ</h1>
                </a>
                {/* <hr style={{marginBottom:'8px'}}></hr> */}

                <a href="https://help.openai.com/en/articles/6825453-chatgpt-release-notes" className="setting1" target="_blank">
                  <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                   stroke-linejoin="round" className="icon-sm icons_position" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9">
                  </polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <h1>Release Notes</h1>
                </a>

                {/* <hr style={{marginBottom:'8px'}}></hr> */}



                <a href="https://openai.com/policies" className="setting1" target="_blank">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                stroke-linejoin="round" className="icon-sm icons_position" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9">
                  </polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <h1>Terms & policies</h1>
                </a>

                                
                {/* <hr style={{marginBottom:'8px'}}></hr> */}
                <div className="setting1" >
                  {/* <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4 icons_position" 
                  height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7">
                    </polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> */}

                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4 icons_position" height="1em" 
                    width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" 
                    y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  <h1>Keyboard shortcuts </h1>
                </div>
            </div>



              <div className='right_popup_button_round' style={{bottom:'2%',position:'absolute' , zIndex:'1' , right:'3%'}} onClick={() => side_popup1()}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"
                 >
                     <circle cx="50" cy="50" r="40" fill="#4a4b53" />
                     <text x="50" y="60" font-size="40" text-anchor="middle" fill="white" >?</text>
                  </svg>    
              </div>
    



       
      {/* <div className="bottom_section">         
          <div className="class1">
              <h1>Hello world</h1>
          </div>
          <div className="class2">
               <h1>Hello world</h1>
          </div>
       </div> */}

          <ChatInput
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            onSend={(message, plugin) => {
              setCurrentMessage(message);
              handleSend(message, 0, plugin);
            }}
            onScrollDownClick={handleScrollDown}
            onRegenerate={() => {
              if (currentMessage) {
                handleSend(currentMessage, 2, null);
              }
            }}
            showScrollDownButton={showScrollDownButton}
          />
        </>
      )}

{/* 
      
              <div className="hii" style={{display: 'flex', justifyContent: 'center', border: 'solid', padding: '3px',  
                 width: 'fit-content', margin: '0 auto' , borderColor:'#202123' , background:'#202123' , borderRadius:'15px' , bottom:'0'}}>
                  <div className="hello" style={{border: 'solid', marginRight: '3px' , background:'#40414f' , borderColor:'#40414f' , borderRadius:'10px' , paddingLeft:'18px' , paddingRight:'18px'}}>
                    <h1 style={{padding:'5px'}}>GPT - 3.5</h1>
                  </div>
                  <div className="hello" style={{border: 'solid' , borderColor:'#202123' , background:'#202123' , paddingLeft:'18px' , paddingRight:'18px'}}>
                  <h1  style={{padding:'5px'}}>GPT - 3.5</h1>
                  </div>
                </div> */}


    </div>
  );
});
Chat.displayName = 'Chat';

