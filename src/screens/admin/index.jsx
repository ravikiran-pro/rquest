import React from 'react';
import Category from './category';
import { Col, Row } from 'antd';
import { Tabs } from 'antd';
import './index.css'
import SubCategory from './subcategory';

const onChange = (key) => {
  console.log(key);
};

const items = [
  {
    key: '1',
    label: 'Category',
    children: <Category />
  },
  {
    key: '2',
    label: 'Sub Category',
    children: <SubCategory />,
  },
  {
    key: '3',
    label: 'Products',
    children: 'Content of Tab Pane 3',
  },
];

const Admin = () =>
  <Row justify={'center'} >
    <Col span={20}>
      <Tabs defaultActiveKey="1" items={items} onChange={onChange} />;
    </Col>
  </Row>

export default Admin;