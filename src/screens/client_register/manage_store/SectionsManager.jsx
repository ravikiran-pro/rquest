import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Checkbox, Drawer, Dropdown, Empty, Grid, Input, Modal, Skeleton, Tooltip, Typography, message } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  MoreOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FolderOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../../app/utils';
import { apiErrorText } from '../../../app/utils/catalogue_api';
import useShopListings from './useShopListings';
import { ListingThumb, StockPill } from './ListingBits';
import { assignSection } from './inventoryApi';
import './manage_store_catalog.css';

const { Title, Text } = Typography;
const MAX_SECTIONS = 50;

/* ------------------------------------------------------------------ */
/* Items of one section, with "Move to…"                               */
/* ------------------------------------------------------------------ */

const SectionItemsDrawer = ({ shopId, section, sections, onClose, onMoved }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const list = useShopListings(shopId, { section_id: section.id }, { pageSize: 50 });
  const [selected, setSelected] = useState(() => new Set());
  const [moving, setMoving] = useState(false);

  const move = async (targetId) => {
    const ids = Array.from(selected);
    setMoving(true);
    const res = await assignSection(shopId, ids, targetId);
    setMoving(false);
    if (res.error) {
      message.error(apiErrorText(res.error, 'Could not move these items'));
      return;
    }
    const target = sections.find((s) => s.id === targetId);
    message.success(`${res.updated} moved to ${target?.name || 'the section'}`);
    list.removeItems(ids);
    setSelected(new Set());
    onMoved?.();
  };

  const others = sections.filter((s) => s.id !== section.id);

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${section.name} · ${section.count ?? list.total} items`}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '88%' : undefined}
      width={isMobile ? undefined : 560}
      destroyOnClose
      footer={
        <div className="mc-drawer-footer">
          <span className="ms-muted">{selected.size} selected</span>
          <Dropdown
            trigger={['click']}
            disabled={selected.size === 0 || others.length === 0}
            menu={{ items: others.map((s) => ({ key: String(s.id), label: s.name })), onClick: ({ key }) => move(Number(key)) }}
          >
            <Button type="primary" className="ms-btn-primary" icon={<FolderOutlined />} loading={moving} disabled={selected.size === 0}>
              Move to…
            </Button>
          </Dropdown>
        </div>
      }
    >
      {list.loading && !list.loaded ? (
        <Skeleton active />
      ) : list.error && list.items.length === 0 ? (
        <Alert type="error" showIcon message={list.error} action={<Button size="small" onClick={() => list.reload({ silent: false })}>Retry</Button>} />
      ) : list.items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No items in this section" />
      ) : (
        <>
          <div className="mc-inv-list">
            {list.items.map((item) => (
              <label key={item.id} className="mc-inv-row mc-inv-row--pick">
                <Checkbox
                  checked={selected.has(item.id)}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })
                  }
                  aria-label={`Select ${item.name}`}
                />
                <ListingThumb src={item.img_url} alt="" className="mc-inv-thumb" />
                <div className="mc-inv-main">
                  <div className="mc-inv-name">{item.name}</div>
                  <div className="mc-inv-meta">
                    <StockPill item={item} />
                  </div>
                </div>
              </label>
            ))}
          </div>
          {list.hasMore && (
            <div className="ms-list-footer">
              <Button onClick={list.loadMore} loading={list.loadingMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
};

SectionItemsDrawer.propTypes = {
  shopId: PropTypes.string.isRequired,
  section: PropTypes.object.isRequired,
  sections: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onMoved: PropTypes.func,
};

/* ------------------------------------------------------------------ */
/* Sections manager (spec §F7)                                         */
/* ------------------------------------------------------------------ */

const SectionsManager = ({ shop, sectionsState, onChanged }) => {
  const shopId = shop?.id;
  const { sections, loading, loaded, error, reload, setSections } = sectionsState;
  const [modal, modalHolder] = Modal.useModal();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [rowBusy, setRowBusy] = useState({});
  const [openSection, setOpenSection] = useState(null);

  const busy = (id, on) => setRowBusy((b) => ({ ...b, [id]: on }));

  const addSection = async () => {
    const name = newName.trim();
    if (!name) {
      setAddError('Enter a section name');
      return;
    }
    setSaving(true);
    setAddError('');
    try {
      const res = await netWorkCall(apiConfig.sections_create, 'POST', JSON.stringify({ shop_id: shopId, name }), true);
      if (res?.success && res.data) {
        setSections((prev) => [...prev, res.data]);
        setNewName('');
        setAdding(false);
        message.success(`Section "${res.data.name}" added`);
        onChanged?.();
      } else {
        setAddError(apiErrorText(res, 'Could not add the section'));
      }
    } catch (err) {
      setAddError('Could not add the section. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = async (section, patch, okText) => {
    busy(section.id, true);
    const prev = sections;
    setSections((list) => list.map((s) => (s.id === section.id ? { ...s, ...patch } : s)));
    try {
      const res = await netWorkCall(`${apiConfig.sections_update}/${section.id}`, 'PUT', JSON.stringify(patch), true);
      if (res?.success && res.data) {
        setSections((list) => list.map((s) => (s.id === section.id ? { ...s, ...res.data } : s)));
        if (okText) message.success(okText);
        onChanged?.();
        return true;
      }
      setSections(prev);
      message.error(apiErrorText(res, 'Could not save the section'));
    } catch (err) {
      setSections(prev);
      message.error('Could not save the section. Check your connection.');
    } finally {
      busy(section.id, false);
    }
    return false;
  };

  const saveRename = async (section) => {
    const name = renameValue.trim();
    if (!name || name === section.name) {
      setRenamingId(null);
      return;
    }
    const ok = await updateSection(section, { name }, 'Section renamed');
    if (ok) setRenamingId(null);
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const prev = sections;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next.map((s, i) => ({ ...s, sort_order: i })));
    try {
      const res = await netWorkCall(
        apiConfig.sections_reorder,
        'PUT',
        JSON.stringify({ shop_id: shopId, ids: next.map((s) => s.id) }),
        true
      );
      if (res?.success && Array.isArray(res.data)) {
        setSections([...res.data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
        onChanged?.();
      } else {
        setSections(prev);
        message.error(apiErrorText(res, 'Could not change the order'));
        if (res?.code === 'ids_mismatch') reload({ silent: true });
      }
    } catch (err) {
      setSections(prev);
      message.error('Could not change the order. Check your connection.');
    }
  };

  const confirmDelete = (section) => {
    modal.confirm({
      title: `Delete "${section.name}"?`,
      content:
        section.count > 0
          ? `Its ${section.count} items move to the section of their category. The items are not deleted.`
          : 'This section has no items.',
      okText: 'Delete section',
      okButtonProps: { danger: true },
      cancelText: 'Keep',
      centered: true,
      onOk: async () => {
        busy(section.id, true);
        try {
          const res = await netWorkCall(`${apiConfig.sections_update}/${section.id}`, 'DELETE', null, true);
          if (res?.success) {
            message.success(res.moved ? `Section deleted · ${res.moved} items moved` : 'Section deleted');
            reload({ silent: true });
            onChanged?.({ listings: true });
          } else {
            message.error(apiErrorText(res, 'Could not delete the section'));
          }
        } catch (err) {
          message.error('Could not delete the section. Check your connection.');
        } finally {
          busy(section.id, false);
        }
      },
    });
  };

  const renderRow = (section, index) => {
    const isRenaming = renamingId === section.id;
    const emptyAuto = section.is_auto && !section.count;
    return (
      <div key={section.id} className={`mc-sec-row ${section.is_hidden ? 'is-hidden' : ''}`}>
        <div className="mc-sec-order">
          <Button
            size="small"
            type="text"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => move(index, -1)}
            aria-label={`Move ${section.name} up`}
          />
          <Button
            size="small"
            type="text"
            icon={<ArrowDownOutlined />}
            disabled={index === sections.length - 1}
            onClick={() => move(index, 1)}
            aria-label={`Move ${section.name} down`}
          />
        </div>
        <div className="mc-sec-main">
          {isRenaming ? (
            <Input
              autoFocus
              size="small"
              value={renameValue}
              maxLength={60}
              onChange={(e) => setRenameValue(e.target.value)}
              onPressEnter={(e) => e.target.blur()}
              onBlur={() => saveRename(section)}
              onKeyDown={(e) => e.key === 'Escape' && setRenamingId(null)}
              aria-label={`New name for ${section.name}`}
            />
          ) : (
            <button type="button" className="mc-sec-name" onClick={() => setOpenSection(section)}>
              <span>{section.name}</span>
              <RightOutlined aria-hidden="true" />
            </button>
          )}
          <div className="mc-sec-meta">
            {section.is_auto && <span className="ms-mini-tag">Auto · {section.sub_category_name || 'category'}</span>}
            <span className="ms-muted">
              {section.count || 0} {section.count === 1 ? 'item' : 'items'}
            </span>
            {section.is_hidden && <span className="ms-mini-tag mc-tag-hidden">Hidden</span>}
            {emptyAuto && !section.is_hidden && <span className="ms-muted">Hidden on your store until it has items</span>}
          </div>
        </div>
        <Tooltip title={section.is_hidden ? 'Show on storefront' : 'Hide from storefront'}>
          <Button
            type="text"
            className="mc-sec-action"
            icon={section.is_hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            loading={Boolean(rowBusy[section.id])}
            onClick={() =>
              updateSection(section, { is_hidden: !section.is_hidden }, section.is_hidden ? 'Shown on your store' : 'Hidden from your store')
            }
            aria-label={section.is_hidden ? `Show ${section.name} on storefront` : `Hide ${section.name} from storefront`}
            aria-pressed={!section.is_hidden}
          />
        </Tooltip>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'rename', icon: <EditOutlined />, label: 'Rename' },
              { key: 'items', icon: <FolderOutlined />, label: 'View items' },
              ...(!section.is_auto ? [{ type: 'divider' }, { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true }] : []),
            ],
            onClick: ({ key }) => {
              if (key === 'rename') {
                setRenamingId(section.id);
                setRenameValue(section.name);
              }
              if (key === 'items') setOpenSection(section);
              if (key === 'delete') confirmDelete(section);
            },
          }}
        >
          <Button type="text" className="mc-sec-action" icon={<MoreOutlined />} aria-label={`More actions for ${section.name}`} />
        </Dropdown>
      </div>
    );
  };

  return (
    <div className="ms-tab-pane">
      {modalHolder}
      <div className="ms-toolbar">
        <div className="ms-toolbar-text">
          <Title level={5} className="ms-section-title">
            Sections
          </Title>
          <Text className="ms-section-desc">
            Sections are the shelves customers scroll on your storefront, in this order. One is made for each of your
            categories.
          </Text>
        </div>
        <div className="ms-toolbar-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="ms-btn-primary"
            onClick={() => setAdding(true)}
            disabled={sections.length >= MAX_SECTIONS}
          >
            Add section
          </Button>
        </div>
      </div>

      {adding && (
        <div className="mc-sec-add">
          <Input
            autoFocus
            placeholder="e.g. Today's specials"
            value={newName}
            maxLength={60}
            status={addError ? 'error' : undefined}
            onChange={(e) => {
              setNewName(e.target.value);
              setAddError('');
            }}
            onPressEnter={addSection}
            aria-label="New section name"
          />
          <Button type="primary" className="ms-btn-primary" loading={saving} onClick={addSection}>
            Add
          </Button>
          <Button
            onClick={() => {
              setAdding(false);
              setNewName('');
              setAddError('');
            }}
          >
            Cancel
          </Button>
          {addError && (
            <div className="ms-field-error" role="alert" style={{ flexBasis: '100%' }}>
              {addError}
            </div>
          )}
        </div>
      )}

      {loading && !loaded ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : error && sections.length === 0 ? (
        <Alert
          type="error"
          showIcon
          message="Your sections didn't load"
          description={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => reload()}>
              Retry
            </Button>
          }
        />
      ) : sections.length === 0 ? (
        <div className="ms-empty ms-empty--compact">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sections yet. Add one, or add products and they get a section for their category." />
        </div>
      ) : (
        <div className="mc-sec-list">{sections.map(renderRow)}</div>
      )}

      {sections.length >= MAX_SECTIONS && <div className="ms-muted" style={{ marginTop: 8 }}>You have the most sections a store can have ({MAX_SECTIONS}).</div>}

      {openSection && (
        <SectionItemsDrawer
          shopId={shopId}
          section={openSection}
          sections={sections}
          onClose={() => setOpenSection(null)}
          onMoved={() => {
            reload({ silent: true });
            onChanged?.({ listings: true });
          }}
        />
      )}
    </div>
  );
};

SectionsManager.propTypes = {
  shop: PropTypes.object.isRequired,
  sectionsState: PropTypes.shape({
    sections: PropTypes.array.isRequired,
    loading: PropTypes.bool,
    loaded: PropTypes.bool,
    error: PropTypes.string,
    reload: PropTypes.func.isRequired,
    setSections: PropTypes.func.isRequired,
  }).isRequired,
  onChanged: PropTypes.func,
};

export default SectionsManager;
