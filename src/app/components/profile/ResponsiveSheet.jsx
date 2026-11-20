import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Drawer, Grid, Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import './profile-components.css';

/**
 * Renders a centred dialog on desktop and a bottom sheet on phones.
 * Keeps one API so forms behave the same on every screen size.
 */
const ResponsiveSheet = ({
  open,
  onClose,
  title,
  footer,
  width = 560,
  zIndex,
  destroyOnHidden = true,
  children,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // Return focus to whatever opened the sheet once it has closed (antd loses it when the
  // trigger re-renders, leaving keyboard users on <body>)
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (open && document.activeElement && document.activeElement !== document.body) {
      returnFocusRef.current = document.activeElement;
    }
  }, [open]);

  const restoreFocus = () => {
    const el = returnFocusRef.current;
    returnFocusRef.current = null;
    if (el && el.isConnected && typeof el.focus === 'function') {
      el.focus();
    }
  };

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        height="100dvh"
        title={title}
        footer={footer}
        zIndex={zIndex}
        destroyOnHidden={destroyOnHidden}
        closable={false}
        afterOpenChange={(isOpen) => {
          if (!isOpen) restoreFocus();
        }}
        extra={
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} aria-label="Close" />
        }
        rootClassName="rq-sheet rq-sheet--mobile"
        styles={{
          body: { padding: '16px' },
          footer: { padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))' },
        }}
      >
        {children}
      </Drawer>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      footer={footer}
      width={width}
      centered
      zIndex={zIndex}
      destroyOnHidden={destroyOnHidden}
      afterClose={restoreFocus}
      rootClassName="rq-sheet rq-sheet--desktop"
      styles={{
        body: { maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' },
      }}
    >
      {children}
    </Modal>
  );
};

ResponsiveSheet.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.node,
  footer: PropTypes.node,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  zIndex: PropTypes.number,
  destroyOnHidden: PropTypes.bool,
  children: PropTypes.node,
};

export default ResponsiveSheet;
