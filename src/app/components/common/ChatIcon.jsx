import React from 'react';
import Icon from '@ant-design/icons';

/**
 * Chat icon: a plain outline speech bubble with two text lines.
 * Drop-in for AntD icons (sizes with font-size, colours with currentColor).
 */
const ChatSvg = () => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 4.5h14A2.5 2.5 0 0 1 21.5 7v8a2.5 2.5 0 0 1-2.5 2.5h-8.2l-4.3 3.2a.6.6 0 0 1-1-.5v-2.7H5A2.5 2.5 0 0 1 2.5 15V7A2.5 2.5 0 0 1 5 4.5Z" />
    <path d="M7.5 9.5h9M7.5 13h5.5" />
  </svg>
);

const ChatIcon = (props) => <Icon component={ChatSvg} {...props} />;

export default ChatIcon;
