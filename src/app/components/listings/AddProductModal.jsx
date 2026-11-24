import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Button,
  Checkbox,
  Upload,
  Alert,
  Skeleton,
  Grid,
  Divider,
  Switch,
  message,
} from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
  LinkOutlined,
  PictureOutlined,
  DownOutlined,
  UpOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';
import { subCategoryArchetype, splitFields, prefillFromSnapshot } from '../../utils/form_schema';
import { getShopSubCategoryIds, shopSubCategories } from '../../utils/shopSubCategories';
import { fallbackStockMode, stockBlockError, stockPayload, DEFAULT_LOW_STOCK } from '../../utils/stock';
import { fetchResolvedForm, uploadImage, apiErrorText, codeText } from '../../utils/catalogue_api';
import { SchemaFieldControl, CatalogueFacts, lockedFacts } from './SchemaField';
import { StockBlock } from './StockControl';
import VariantEditor, { variantStateFromListing, variantStateError, variantPayload } from './VariantEditor';
import './listings.css';

/**
 * Determine the shop's domain archetype based on its category or shop type
 */
export const getShopArchetype = (shop) => {
  // The shop's sub-category says what it sells; the text guess below is for shops without one
  const fromSubCategory = subCategoryArchetype(shop);
  if (fromSubCategory) return fromSubCategory;
  const typeStr = (
    (shop?.shop_type || '') +
    ' ' +
    (shop?.shopCategory?.name || '') +
    ' ' +
    (shop?.shopSubCategory?.name || '')
  ).toLowerCase();
  const has = (...words) => words.some((w) => typeStr.includes(w));
  if (has('health', 'med', 'pharm', 'clinic', 'doctor')) return 'medical';
  if (has('restaurant', 'food', 'bakery', 'cafe', 'biri', 'tiffin', 'hotel', 'eatery')) return 'food';
  if (has('electric', 'hardware', 'technician', 'plumb', 'service', 'laundry', 'repair', 'clean', 'mechanic', 'contractor')) {
    return 'service';
  }
  if (has('salon', 'spa', 'massage', 'beauty', 'barber')) return 'wellness';
  if (has('rental', 'bike', 'audio', 'sport', 'turf', 'vehicle', 'car rental')) return 'rental';
  return 'product';
};

/**
 * Map shop archetype to database listing_type
 */
export const getListingTypeFromArchetype = (archetype) => {
  if (archetype === 'food') return 'food';
  if (archetype === 'service' || archetype === 'wellness') return 'service';
  if (archetype === 'rental') return 'rental';
  return 'product';
};

const TYPE_CONFIG = {
  food: {
    defaultUnit: 'plate',
    unitOptions: ['plate', 'portion', 'pack', 'kg', 'piece'],
    nameLabel: 'Dish name',
    namePlaceholder: 'e.g. Chicken dum biryani (family pack)',
    descPlaceholder: 'Portion size, ingredients, allergens',
  },
  medical: {
    defaultUnit: 'strip',
    unitOptions: ['strip', 'bottle', 'piece', 'box', 'pack', 'tube'],
    nameLabel: 'Medicine or product name',
    namePlaceholder: 'e.g. Paracetamol 500mg (strip of 10)',
    descPlaceholder: 'Usage, storage, precautions',
  },
  product: {
    defaultUnit: 'piece',
    unitOptions: ['piece', 'kg', 'g', 'pack', 'box', 'litre', 'ml', 'meter', 'dozen'],
    nameLabel: 'Product name',
    namePlaceholder: 'e.g. India Gate basmati rice 5kg',
    descPlaceholder: 'Size, packaging or other details',
  },
  service: {
    defaultUnit: 'visit',
    unitOptions: ['visit', 'service', 'session', 'hour'],
    nameLabel: 'Service name',
    namePlaceholder: 'e.g. Split AC deep cleaning',
    descPlaceholder: 'What is included, warranty, parts',
  },
  rental: {
    defaultUnit: 'day',
    unitOptions: ['day', 'hour', 'week', 'month'],
    nameLabel: 'Item for rent',
    namePlaceholder: 'e.g. Honda Activa (per day)',
    descPlaceholder: 'Rental terms, accessories, fuel policy',
  },
};

const configFor = (archetype) =>
  TYPE_CONFIG[archetype === 'wellness' ? 'service' : archetype === 'grocery' ? 'product' : archetype] || TYPE_CONFIG.product;

const CORE_FIELDS = ['name', 'price', 'mrp', 'unit', 'img_url', 'description'];
const ORDER_TOGGLES = ['allow_instant_order', 'allow_enquiry'];

const listingSubId = (item) => {
  const raw = item?.sub_category_id ?? item?.metadata?.sub_category_id;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : null;
};

/**
 * Add or edit one listing (quick custom product, docs/catalogue/03-spec.md §F5).
 * The form comes from GET forms/shop/:shop_id/:sub_id/resolved for the chosen sub-category.
 */
const AddProductModal = ({
  open,
  onClose,
  onSuccess,
  shop,
  editingItem = null,
  width = 720,
  onOpenImportCsv = null,
  initialName = '',
  sections: sectionsProp = null,
  onSectionsChanged = null,
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const shopId = shop?.id;
  const shopSubIds = useMemo(() => getShopSubCategoryIds(shop), [shop]);
  const subNames = useMemo(() => {
    const m = new Map();
    shopSubCategories(shop).forEach((s) => m.set(Number(s.id), s));
    return m;
  }, [shop]);

  const storeArchetype = getShopArchetype(shop);
  const typeConfig = configFor(storeArchetype);
  const defaultListingType = shop?.shopSubCategory?.listing_type || getListingTypeFromArchetype(storeArchetype);

  const [subId, setSubId] = useState(null);
  const [resolved, setResolved] = useState({ fields: [], default_stock_mode: null, listing_type: null, variant_axes: [] });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formTick, setFormTick] = useState(0);

  const [stock, setStock] = useState({ stock_mode: null });
  const [stockError, setStockError] = useState('');

  // Variants: options (size, colour…) with a price / stock row per combination
  const [variantsOn, setVariantsOn] = useState(false);
  const [variantState, setVariantState] = useState({ axes: [], rows: [] });
  const [variantError, setVariantError] = useState('');
  const stockTouched = useRef(false);
  // Set only when the owner changes the stock block (not when the sheet opens)
  const stockEdited = useRef(false);

  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState(null);
  const [sectionError, setSectionError] = useState('');
  const sectionTouched = useRef(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);

  const [catalogItem, setCatalogItem] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const dismissedNames = useRef(new Set());
  const suggestSeq = useRef(0);

  const [showMore, setShowMore] = useState(false);
  const [imgMode, setImgMode] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameValue = Form.useWatch('name', form);
  const imgValue = Form.useWatch('img_url', form);

  const isEdit = Boolean(editingItem?.id);
  const editSubId = isEdit ? listingSubId(editingItem) : null;
  const listingType = resolved.listing_type || subNames.get(subId)?.listing_type || editingItem?.listing_type || defaultListingType;
  const isCatalogueListing = Boolean(editingItem?.catalog_item_id || editingItem?.metadata?.catalog_item_id);

  /* ---------- Open: reset everything for this item ---------- */
  useEffect(() => {
    if (!open) return;
    stockTouched.current = false;
    stockEdited.current = false;
    sectionTouched.current = false;
    dismissedNames.current = new Set();
    setCatalogItem(null);
    setSuggestion(null);
    setShowMore(false);
    setFormError('');
    setStockError('');
    setSectionError('');
    setNewSectionName('');
    setVariantError('');
    form.resetFields();
    const storedVariants = variantStateFromListing(editingItem);
    setVariantsOn(storedVariants.axes.length > 0);
    setVariantState(storedVariants);
    if (editingItem) {
      const sub = listingSubId(editingItem);
      setSubId(sub !== null && shopSubIds.includes(sub) ? sub : shopSubIds[0] ?? sub ?? null);
      setStock({
        stock_mode: editingItem.stock_mode || fallbackStockMode(editingItem.listing_type),
        stock_qty: editingItem.stock_qty ?? null,
        low_stock_threshold: editingItem.low_stock_threshold ?? null,
        is_available: editingItem.is_available !== false,
      });
      stockTouched.current = true;
      setSectionId(editingItem.section_id ?? null);
      sectionTouched.current = true;
      setImgMode('upload');
      form.setFieldsValue({
        name: editingItem.name,
        price: editingItem.price,
        mrp: editingItem.mrp ?? null,
        unit: editingItem.unit || typeConfig.defaultUnit,
        img_url: editingItem.img_url || '',
        description: editingItem.description || '',
        metadata: {
          ...(editingItem.metadata || {}),
          allow_instant_order: editingItem.metadata?.allow_instant_order !== false,
          allow_enquiry: editingItem.metadata?.allow_enquiry !== false,
        },
      });
    } else {
      setSubId(shopSubIds[0] ?? null);
      setStock({ stock_mode: null });
      setSectionId(null);
      setImgMode('upload');
      form.setFieldsValue({
        name: initialName || '',
        unit: typeConfig.defaultUnit,
        metadata: { allow_instant_order: true, allow_enquiry: true },
      });
    }
    // typeConfig follows the shop; shopSubIds is memoised on it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingItem, shopId]);

  /* ---------- The resolved form for the chosen sub-category ---------- */
  useEffect(() => {
    if (!open || !shopId) return undefined;
    let cancelled = false;
    setFormLoading(true);
    setFormError('');
    fetchResolvedForm(shopId, subId, { force: formTick > 0 })
      .then((data) => {
        if (cancelled) return;
        setResolved(data);
        // New items start in the sub-category's default stock mode
        if (!stockTouched.current) {
          const mode = data.default_stock_mode || fallbackStockMode(data.listing_type || defaultListingType);
          setStock({
            stock_mode: mode,
            stock_qty: null,
            low_stock_threshold: mode === 'tracked' ? DEFAULT_LOW_STOCK : null,
            is_available: true,
          });
        }
        // Defaults for fields the item has no value for yet
        const current = form.getFieldValue('metadata') || {};
        const defaults = {};
        data.fields.forEach((f) => {
          if (f?.key && current[f.key] === undefined && f.defaultValue !== undefined && f.defaultValue !== null) {
            defaults[f.key] = f.defaultValue;
          }
        });
        if (Object.keys(defaults).length > 0) form.setFieldsValue({ metadata: defaults });
      })
      .catch((res) => {
        if (cancelled) return;
        setResolved({ fields: [], default_stock_mode: null, listing_type: null, variant_axes: [] });
        setFormError(apiErrorText(res, 'Could not load the product form for this category.'));
        if (!stockTouched.current) {
          const mode = fallbackStockMode(defaultListingType);
          setStock({ stock_mode: mode, stock_qty: null, low_stock_threshold: mode === 'tracked' ? DEFAULT_LOW_STOCK : null, is_available: true });
        }
      })
      .finally(() => {
        if (!cancelled) setFormLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shopId, subId, formTick]);

  /* ---------- Sections for the select ---------- */
  useEffect(() => {
    if (!open || !shopId) return undefined;
    if (Array.isArray(sectionsProp)) {
      setSections(sectionsProp);
      return undefined;
    }
    let cancelled = false;
    netWorkCall(`${apiConfig.sections_manage}/${shopId}`, 'GET', null, true)
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data)) setSections(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, shopId, sectionsProp]);

  // Until the owner picks one, a new item goes to its sub-category's own section
  const autoSection = useMemo(
    () => sections.find((s) => s.is_auto && Number(s.sub_category_id) === Number(subId)) || null,
    [sections, subId]
  );
  useEffect(() => {
    if (!sectionTouched.current) setSectionId(autoSection ? autoSection.id : null);
  }, [autoSection]);

  /* ---------- "Found in catalogue" autofill for new items ---------- */
  useEffect(() => {
    if (!open || isEdit || catalogItem) return undefined;
    const q = (nameValue || '').trim();
    if (q.length < 3 || dismissedNames.current.has(q.toLowerCase())) {
      setSuggestion(null);
      return undefined;
    }
    const seq = ++suggestSeq.current;
    const t = setTimeout(() => {
      netWorkCall(`${apiConfig.catalog_search}?q=${encodeURIComponent(q)}&limit=3&shop_id=${encodeURIComponent(shopId || '')}`, 'GET', null, true)
        .then((res) => {
          if (seq !== suggestSeq.current) return;
          const hit = Array.isArray(res?.data) ? res.data[0] : null;
          setSuggestion(hit && hit.id && hit.name ? hit : null);
        })
        .catch(() => {
          if (seq === suggestSeq.current) setSuggestion(null);
        });
    }, 400);
    return () => clearTimeout(t);
  }, [open, isEdit, catalogItem, nameValue, shopId]);

  const acceptSuggestion = () => {
    if (!suggestion) return;
    const values = { name: suggestion.name };
    if (suggestion.image_url) values.img_url = suggestion.image_url;
    const mrp = Number(suggestion.mrp_hint ?? suggestion.mrp);
    if (mrp > 0) {
      values.mrp = mrp;
      if (form.getFieldValue('price') === undefined || form.getFieldValue('price') === null) values.price = mrp;
    }
    form.setFieldsValue(values);
    setCatalogItem(suggestion);
    setSuggestion(null);
  };

  const dismissSuggestion = () => {
    dismissedNames.current.add((nameValue || '').trim().toLowerCase());
    setSuggestion(null);
  };

  /* ---------- Field groups ---------- */
  const lockedKeys = useMemo(() => {
    if (!isEdit) {
      // Nothing is locked on create: the search row carries no snapshot, so the client cannot tell
      // which catalogue fields the server will fill. Owners can supply any value the snapshot lacks.
      return [];
    }
    if (!isCatalogueListing || editSubId !== subId) return [];
    if (Array.isArray(editingItem.locked_keys)) return editingItem.locked_keys;
    return prefillFromSnapshot(resolved.fields, editingItem.catalog_snapshot).lockedKeys;
  }, [isEdit, catalogItem, resolved.fields, isCatalogueListing, editSubId, subId, editingItem]);

  const groups = useMemo(() => splitFields(resolved.fields, lockedKeys), [resolved.fields, lockedKeys]);
  const lockedFactList = useMemo(
    () => lockedFacts(groups.locked, isEdit ? editingItem?.metadata : {}),
    [groups.locked, isEdit, editingItem]
  );

  /* ---------- Image ---------- */
  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      form.setFieldsValue({ img_url: url });
    } catch (err) {
      message.error(err?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
    return false;
  };

  /* ---------- New section inline ---------- */
  const createSection = async () => {
    const name = newSectionName.trim();
    if (!name) return;
    setCreatingSection(true);
    try {
      const res = await netWorkCall(apiConfig.sections_create, 'POST', JSON.stringify({ shop_id: shopId, name }), true);
      if (res?.success && res.data) {
        const next = [...sections, res.data];
        setSections(next);
        setSectionId(res.data.id);
        sectionTouched.current = true;
        setNewSectionName('');
        onSectionsChanged?.(next);
      } else {
        message.error(apiErrorText(res, 'Could not create the section'));
      }
    } catch (err) {
      message.error('Could not create the section. Check your connection.');
    } finally {
      setCreatingSection(false);
    }
  };

  /* ---------- Save ---------- */
  const showSaveError = (res, fallback) => {
    const fieldErrors = Array.isArray(res?.errors) ? res.errors.filter((e) => e?.key) : [];
    const formErrors = [];
    fieldErrors.forEach((e) => {
      if (e.key === 'variant_axes' || String(e.key).startsWith('variants')) setVariantError(e.message);
      else if (e.key === 'stock_qty' || e.key === 'stock_mode') setStockError(e.message);
      else if (e.key === 'section_id') setSectionError(e.message);
      else if (CORE_FIELDS.includes(e.key)) formErrors.push({ name: e.key, errors: [e.message] });
      else formErrors.push({ name: ['metadata', e.key], errors: [e.message] });
    });
    if (res?.code === 'price_above_mrp' || res?.error === 'price_above_mrp') {
      formErrors.push({ name: 'price', errors: [codeText('price_above_mrp')] });
    }
    if (res?.code === 'invalid_price') formErrors.push({ name: 'price', errors: [codeText('invalid_price')] });
    if (res?.code === 'invalid_mrp') formErrors.push({ name: 'mrp', errors: [codeText('invalid_mrp')] });
    if (res?.code === 'is_available_derived') setStockError(codeText('is_available_derived'));
    if (res?.code === 'stock_qty_required') setStockError(codeText('stock_qty_required'));
    if (res?.code === 'section_not_in_shop') setSectionError(codeText('section_not_in_shop'));
    if (formErrors.length > 0) {
      form.setFields(formErrors);
      // Optional fields with errors live under "More details"
      if (formErrors.some((f) => Array.isArray(f.name) && groups.optional.some((o) => o.key === f.name[1]))) setShowMore(true);
    }
    message.error(apiErrorText(res, fallback));
  };

  const handleFinish = async (values) => {
    if (!shopId) {
      message.error('No shop selected');
      return;
    }
    // With variants the quantity is per variant: only the mode and alert level are checked here
    const stockProblem = stockBlockError(variantsOn ? { ...stock, stock_qty: 0 } : stock);
    if (stockProblem) {
      setStockError(stockProblem);
      return;
    }
    const variantProblem = variantsOn ? variantStateError(variantState, stock.stock_mode) : null;
    if (variantProblem) {
      setVariantError(variantProblem);
      return;
    }
    setStockError('');
    setSectionError('');
    setVariantError('');

    const formMeta = values.metadata || {};
    const fieldKeys = new Set(resolved.fields.map((f) => f.key));
    const keptMeta = {};
    Object.entries(formMeta).forEach(([key, value]) => {
      if (fieldKeys.has(key) || ORDER_TOGGLES.includes(key)) keptMeta[key] = value;
    });
    // Changing sub-category drops values the new form does not have; otherwise hidden values are kept
    const metadata = isEdit && editSubId === subId ? { ...(editingItem.metadata || {}), ...keptMeta } : keptMeta;
    lockedKeys.forEach((key) => {
      if (!isEdit) delete metadata[key];
    });

    // Edit: stock is sent only when the owner changed it, so a name or price edit cannot write back
    // the count from when the sheet opened (units sold since would be lost). Quantity is also left out
    // when only the threshold changed.
    const stockFields = !isEdit || stockEdited.current ? stockPayload(stock) : {};
    if (isEdit && stock.stock_mode === editingItem.stock_mode && Number(stock.stock_qty) === Number(editingItem.stock_qty)) {
      delete stockFields.stock_qty;
    }
    const wasVariant = Array.isArray(editingItem?.variant_axes) && editingItem.variant_axes.length > 0;
    // Variants carry price and stock: the listing sends only the mode and alert level
    let priceFields;
    let variantFields = {};
    if (variantsOn) {
      delete stockFields.stock_qty;
      delete stockFields.is_available;
      if (stock.stock_mode) stockFields.stock_mode = stock.stock_mode;
      priceFields = {};
      variantFields = variantPayload(variantState, stock.stock_mode);
    } else {
      priceFields = {
        price: Number(values.price),
        mrp: values.mrp === undefined || values.mrp === null || values.mrp === '' ? null : Number(values.mrp),
      };
      if (wasVariant) {
        // Back to a single price: the count is entered again for the whole item
        variantFields = { variant_axes: [] };
        Object.assign(stockFields, stockPayload(stock));
      }
    }

    const payload = {
      shop_id: shopId,
      name: (values.name || '').trim(),
      ...priceFields,
      ...variantFields,
      unit: values.unit,
      img_url: (values.img_url || '').trim(),
      description: (values.description || '').trim(),
      listing_type: listingType,
      ...(subId !== null && subId !== undefined ? { sub_category_id: subId } : {}),
      ...(sectionId !== null && sectionId !== undefined ? { section_id: sectionId } : {}),
      ...stockFields,
      ...(!isEdit && catalogItem?.id ? { catalog_item_id: catalogItem.id } : {}),
      metadata,
    };

    setSubmitting(true);
    try {
      const res = isEdit
        ? await netWorkCall(`${apiConfig.listings_update}/${editingItem.id}`, 'PUT', JSON.stringify(payload), true)
        : await netWorkCall(apiConfig.listings_create, 'POST', JSON.stringify(payload), true);
      if (res?.success) {
        message.success(isEdit ? 'Changes saved' : `${payload.name} added to your store`);
        onSuccess?.(res.data);
        onClose();
      } else if (res?.httpStatus === 409 || res?.code === 'already_added') {
        message.info(codeText('already_added'));
      } else {
        showSaveError(res, isEdit ? 'Could not save your changes' : 'Could not add this item');
      }
    } catch (err) {
      console.error('Error saving listing:', err);
      message.error('Could not save. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  const unitOptions = useMemo(() => {
    const list = [...typeConfig.unitOptions];
    const current = editingItem?.unit;
    if (current && !list.includes(current)) list.unshift(current);
    return list.map((u) => ({ value: u, label: u }));
  }, [typeConfig, editingItem]);

  const sectionOptions = sections.map((s) => ({
    value: s.id,
    label: s.is_auto ? `${s.name} (auto)` : s.name,
  }));

  const renderField = (field) => (
    <Col xs={24} sm={field.type === 'textarea' ? 24 : 12} key={field.key}>
      <Form.Item
        name={['metadata', field.key]}
        label={field.label}
        htmlFor={`lc-meta-${field.key}`}
        rules={field.required && field.type !== 'boolean' ? [{ required: true, message: `Enter ${(field.label || 'this field').toLowerCase()}` }] : []}
      >
        <SchemaFieldControl field={field} id={`lc-meta-${field.key}`} />
      </Form.Item>
    </Col>
  );

  const multiSub = shopSubIds.length > 1;
  const title = isEdit ? `Edit ${editingItem.name || 'item'}` : 'Create custom item';

  const footer = (
    <div className="lc-sheet-footer">
      {!isEdit && onOpenImportCsv && !isMobile && (
        <Button
          icon={<UploadOutlined />}
          onClick={() => {
            onClose();
            onOpenImportCsv();
          }}
          style={{ marginInlineEnd: 'auto' }}
        >
          Import CSV instead
        </Button>
      )}
      <Button onClick={onClose}>Cancel</Button>
      <Button
        type="primary"
        icon={isEdit ? <SaveOutlined /> : <PlusOutlined />}
        loading={submitting}
        disabled={uploading}
        onClick={() => form.submit()}
        className="ms-btn-primary"
      >
        {isEdit ? 'Save changes' : 'Add to store'}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '92%' : undefined}
      width={isMobile ? undefined : width}
      destroyOnClose
      rootClassName="lc-sheet"
      footer={footer}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional" scrollToFirstError>
        {/* Sub-category picks the form */}
        {multiSub && (
          <div className="lc-sub-chips" role="radiogroup" aria-label="Category for this item">
            {shopSubIds.map((id) => {
              const sub = subNames.get(id);
              const active = id === subId;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`lc-chip ${active ? 'is-active' : ''}`}
                  onClick={() => setSubId(id)}
                >
                  {sub?.name || `Category ${id}`}
                </button>
              );
            })}
          </div>
        )}

        <Form.Item
          name="name"
          label={typeConfig.nameLabel}
          rules={[{ required: true, whitespace: true, message: 'Enter a name' }]}
        >
          <Input placeholder={typeConfig.namePlaceholder} maxLength={200} autoComplete="off" />
        </Form.Item>

        {suggestion && !catalogItem && (
          <div className="lc-autofill" role="status">
            <span>
              Found in catalogue: <span className="lc-autofill-name">{suggestion.name}</span>
              {[suggestion.brand, suggestion.quantity_label].filter(Boolean).length > 0 && (
                <span className="ms-muted"> · {[suggestion.brand, suggestion.quantity_label].filter(Boolean).join(' · ')}</span>
              )}
            </span>
            <span>
              <Button size="small" type="primary" onClick={acceptSuggestion} className="ms-btn-primary">
                Use it
              </Button>{' '}
              <Button size="small" type="text" onClick={dismissSuggestion}>
                No thanks
              </Button>
            </span>
          </div>
        )}
        {catalogItem && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 14 }}
            message={`Using "${catalogItem.name}" from the catalogue`}
            description="Brand, pack size and other facts come from the catalogue when you save. Set your price and stock."
            action={
              <Button size="small" type="text" onClick={() => setCatalogItem(null)}>
                Undo
              </Button>
            }
          />
        )}

        {/* Options: a product sold in several sizes / colours / packs */}
        <div className="lc-sheet-block">
          <label className="lc-stock-switch" style={{ marginBottom: variantsOn ? 10 : 0 }}>
            <Switch
              checked={variantsOn}
              onChange={(checked) => {
                setVariantsOn(checked);
                setVariantError('');
                if (checked && !variantState.axes.length) {
                  const first = resolved.variant_axes?.[0];
                  setVariantState({
                    axes: [first ? { key: first.key, label: first.label, values: [] } : { key: '', label: '', values: [] }],
                    rows: [],
                  });
                }
                if (!checked && isEdit && (form.getFieldValue('price') === undefined || form.getFieldValue('price') === null)) {
                  form.setFieldsValue({ price: editingItem.price, mrp: editingItem.mrp ?? null });
                }
              }}
              aria-label="This item comes in options"
            />
            <span>
              {variantsOn ? 'Comes in options' : 'Comes in options (size, colour, pack…)'}
              {resolved.variant_axes?.length > 0 && !variantsOn && (
                <span className="ms-muted"> · {resolved.variant_axes.map((a) => a.label).join(', ')}</span>
              )}
            </span>
          </label>
          {variantsOn && (
            <VariantEditor
              value={variantState}
              onChange={(next) => {
                setVariantState(next);
                setVariantError('');
              }}
              axisDefs={resolved.variant_axes || []}
              stockMode={stock.stock_mode}
              listingType={listingType}
              error={variantError}
            />
          )}
        </div>

        <Row gutter={12} style={variantsOn ? { display: 'none' } : undefined}>
          <Col xs={12}>
            <Form.Item
              name="price"
              label="Selling price (₹)"
              dependencies={['mrp']}
              rules={[
                { required: !variantsOn, message: 'Enter a price' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (variantsOn) return Promise.resolve();
                    const mrp = getFieldValue('mrp');
                    if (value === null || value === undefined || mrp === null || mrp === undefined || mrp === '') return Promise.resolve();
                    return Number(value) > Number(mrp) ? Promise.reject(new Error('Price is above MRP')) : Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber min={0} precision={2} inputMode="decimal" placeholder="0" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="mrp" label="MRP (₹)">
              <InputNumber min={0} precision={2} inputMode="decimal" placeholder="Optional" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="unit" label="Sold per" rules={[{ required: true, message: 'Choose a unit' }]}>
          <Select options={unitOptions} showSearch aria-label="Sold per" />
        </Form.Item>

        {/* Photo: upload, or a link */}
        <Form.Item label="Photo">
          <div className="lc-photo">
            <div className="lc-photo-thumb" aria-hidden="true">
              {imgValue ? <img src={imgValue} alt="" /> : <PictureOutlined />}
            </div>
            <Upload accept="image/*" showUploadList={false} beforeUpload={handleUpload}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                {imgValue ? 'Change photo' : 'Upload photo'}
              </Button>
            </Upload>
            <Button type="link" icon={<LinkOutlined />} onClick={() => setImgMode(imgMode === 'link' ? 'upload' : 'link')}>
              {imgMode === 'link' ? 'Hide link' : 'Use link'}
            </Button>
            {imgValue && (
              <Button type="text" danger size="small" onClick={() => form.setFieldsValue({ img_url: '' })}>
                Remove
              </Button>
            )}
          </div>
          <Form.Item name="img_url" noStyle>
            <Input
              placeholder="https://…"
              inputMode="url"
              aria-label="Photo link"
              style={{ marginTop: 8, display: imgMode === 'link' ? undefined : 'none' }}
            />
          </Form.Item>
        </Form.Item>

        {/* Stock: mandatory */}
        <div className="lc-sheet-block">
          <div className="lc-sheet-block-title">Stock</div>
          {stock.stock_mode ? (
            <StockBlock
              value={stock}
              onChange={(next) => {
                stockTouched.current = true;
                stockEdited.current = true;
                setStock(next);
                setStockError('');
              }}
              listingType={listingType}
              modes={listingType === 'service' ? ['always', 'toggle'] : undefined}
              error={stockError}
              idPrefix="lc-stock"
              perVariant={variantsOn}
            />
          ) : (
            <Skeleton.Input active size="small" block />
          )}
        </div>

        <Form.Item label="Section" validateStatus={sectionError ? 'error' : undefined} help={sectionError || undefined}>
          <Select
            value={sectionId ?? undefined}
            onChange={(v) => {
              sectionTouched.current = true;
              setSectionId(v ?? null);
              setSectionError('');
            }}
            allowClear
            placeholder={subNames.get(subId)?.name ? `Automatic: ${subNames.get(subId).name}` : 'Automatic'}
            options={sectionOptions}
            aria-label="Section"
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '6px 0' }} />
                <div style={{ display: 'flex', gap: 6, padding: '0 6px 6px' }}>
                  <Input
                    size="small"
                    placeholder="New section name"
                    value={newSectionName}
                    maxLength={60}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label="New section name"
                  />
                  <Button size="small" icon={<PlusOutlined />} loading={creatingSection} onClick={createSection} disabled={!newSectionName.trim()}>
                    Add
                  </Button>
                </div>
              </>
            )}
          />
        </Form.Item>

        {/* Form fields for the sub-category */}
        {formLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} title={false} />
        ) : (
          <>
            {formError && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 14 }}
                message={formError}
                description="You can still save the basics. Details can be added later."
                action={
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => setFormTick((n) => n + 1)}>
                    Retry
                  </Button>
                }
              />
            )}

            {groups.locked.length > 0 && (
              <div className="lc-sheet-block">
                <div className="lc-sheet-block-title">From catalogue</div>
                {lockedFactList.length > 0 ? (
                  <CatalogueFacts facts={lockedFactList} tag />
                ) : (
                  <CatalogueFacts facts={groups.locked.map((f) => ({ label: f.label, value: 'from catalogue' }))} tag />
                )}
              </div>
            )}

            {groups.required.length > 0 && <Row gutter={12}>{groups.required.map(renderField)}</Row>}

            {groups.optional.length > 0 && (
              <>
                <Button
                  type="link"
                  icon={showMore ? <UpOutlined /> : <DownOutlined />}
                  onClick={() => setShowMore((v) => !v)}
                  aria-expanded={showMore}
                  style={{ padding: 0, marginBottom: 10 }}
                >
                  {showMore ? 'Fewer details' : `More details (${groups.optional.length})`}
                </Button>
                {/* Kept mounted so values survive collapsing */}
                <div style={{ display: showMore ? undefined : 'none' }}>
                  <Row gutter={12}>{groups.optional.map(renderField)}</Row>
                </div>
              </>
            )}
          </>
        )}

        <Form.Item name="description" label="Description">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder={typeConfig.descPlaceholder} maxLength={2000} />
        </Form.Item>

        <div className="lc-sheet-block">
          <div className="lc-sheet-block-title">Customers can</div>
          <Form.Item name={['metadata', 'allow_instant_order']} valuePropName="checked" noStyle>
            <Checkbox>Order directly</Checkbox>
          </Form.Item>
          <br />
          <Form.Item name={['metadata', 'allow_enquiry']} valuePropName="checked" noStyle>
            <Checkbox>Ask a question or request a quote</Checkbox>
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
};

AddProductModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  onOpenImportCsv: PropTypes.func,
  shop: PropTypes.object,
  editingItem: PropTypes.object,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialName: PropTypes.string,
  sections: PropTypes.array,
  onSectionsChanged: PropTypes.func,
};

export default AddProductModal;
