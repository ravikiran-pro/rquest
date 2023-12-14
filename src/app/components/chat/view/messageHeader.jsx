import { format, isToday, isYesterday } from 'date-fns'
import { Card, Space, Avatar, Row, Col, Badge } from 'antd';
import './style.css'
const ColorList = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae'];

function formatDateTime(dateTimeString) {
    const dateTime = new Date(dateTimeString);

    if (isToday(dateTime)) {
        return format(dateTime, 'h:mm a');
    } else if (isYesterday(dateTime)) {
        return 'Yesterday';
    } else {
        return format(dateTime, 'dd-MM-yyyy');
    }
}

const MessageHeader = ({
    name,
    message,
    handleHeaderClick,
    color,
    totalUnread,
    dateTime
}) => {
    return <Card style={{ width: '100%' }} className='message-header-root' onClick={handleHeaderClick}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <Avatar style={{
                backgroundColor: ColorList[color],
                verticalAlign: 'middle',
                marginRight: 10
            }}
                size="large"
            >
                {name[0].toUpperCase()}
            </Avatar>

            <Col style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                <div className='title'>
                    <span>{name}</span>
                </div>
                <div className='sub-title'>{message}</div>
            </Col>
        </div>
        <div >
            <Col className='message-header-edge'>
                <div>
                    <span>{formatDateTime(dateTime)}</span>
                </div>
                <div>
                    {totalUnread ? <Badge count={totalUnread}></Badge> : ''}
                </div>
            </Col>
        </div>
    </Card>
}


export default MessageHeader;