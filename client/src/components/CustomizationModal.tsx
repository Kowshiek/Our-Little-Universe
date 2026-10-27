import React, { useState } from 'react';
import { useUniverse } from '../context/UniverseContext';
import { Hammer, ShoppingBag, Box, Trash2, Plus, Star, X, Check } from 'lucide-react';

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlacementItem: (itemType: string) => void;
}

const SHOP_CATALOG = [
  {
    type: 'cherry_blossom',
    name: 'Blossom Tree',
    cost: 20,
    desc: 'Lush pink celestial tree that sheds soft starlight petals.',
    icon: '🌸',
  },
  {
    type: 'crystal_lamp',
    name: 'Starlight Lamp',
    cost: 15,
    desc: 'Lavender wrought-iron lamp post that illuminates the night.',
    icon: '🏮',
  },
  {
    type: 'wooden_bench',
    name: 'Love Bench',
    cost: 25,
    desc: 'Carved cedar bench for couples to stargaze side by side.',
    icon: '🪑',
  },
  {
    type: 'star_fountain',
    name: 'Celestial Fountain',
    cost: 50,
    desc: 'Shimmering cosmic fountain filled with stardust water.',
    icon: '⛲',
  },
  {
    type: 'cosmic_flower',
    name: 'Starflower Bed',
    cost: 10,
    desc: 'Glowing lavender and pink floral cluster.',
    icon: '🌺',
  },
  {
    type: 'heart_monument',
    name: 'Heart Monument',
    cost: 100,
    desc: 'Grand golden monument commemorating two hearts in one cosmos.',
    icon: '💖',
  },
];

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  isOpen,
  onClose,
  onSelectPlacementItem,
}) => {
  const { gameData, purchaseItem, removeDecoration } = useUniverse();
  const [tab, setTab] = useState<'shop' | 'inventory' | 'placed'>('shop');
  const [purchasingType, setPurchasingType] = useState<string | null>(null);

  if (!isOpen || !gameData) return null;

  const handleBuy = async (itemType: string, cost: number) => {
    setPurchasingType(itemType);
    await purchaseItem(itemType, cost);
    setPurchasingType(null);
  };

  const handlePlace = (itemType: string) => {
    onSelectPlacementItem(itemType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-darkest/90 backdrop-blur-md p-4 select-none animate-fadeIn">
      <div className="max-w-xl w-full glass-panel rounded-3xl p-6 sm:p-8 relative border border-pink-500/30 shadow-2xl max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center shadow-lg border border-pink-300/40">
              <Hammer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Planet Workshop</h2>
              <p className="text-xs text-purple-300">Design your shared cosmic home</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-amber-400/40 shadow-inner">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span className="font-extrabold text-sm text-starlight">
              {gameData.state.sharedStars} Stars
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-purple-500/20 mb-5">
          <button
            onClick={() => setTab('shop')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              tab === 'shop' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cosmic Shop</span>
          </button>
          <button
            onClick={() => setTab('inventory')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              tab === 'inventory' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Inventory ({gameData.inventory.length})</span>
          </button>
          <button
            onClick={() => setTab('placed')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              tab === 'placed' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-purple-300 hover:text-white'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>Placed ({gameData.placedObjects.length})</span>
          </button>
        </div>

        {/* Content area */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          {tab === 'shop' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_CATALOG.map((item) => {
                const canAfford = gameData.state.sharedStars >= item.cost;
                const isBuying = purchasingType === item.type;

                return (
                  <div
                    key={item.type}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-purple-500/20 flex flex-col justify-between hover:border-pink-500/40 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{item.icon}</span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-300">
                          <Star className="w-3.5 h-3.5 fill-amber-300" />
                          <span>{item.cost}</span>
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-white mb-1">{item.name}</h4>
                      <p className="text-xs text-purple-300/80 mb-3">{item.desc}</p>
                    </div>

                    <button
                      onClick={() => handleBuy(item.type, item.cost)}
                      disabled={!canAfford || isBuying}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        canAfford
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow'
                          : 'bg-slate-800 text-purple-400/50 cursor-not-allowed'
                      }`}
                    >
                      {isBuying ? 'Purchasing...' : canAfford ? 'Purchase' : 'Not enough stars'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'inventory' && (
            <div className="space-y-3">
              {gameData.inventory.length === 0 ? (
                <div className="text-center py-10 text-purple-300 text-sm">
                  Your workshop inventory is empty. Visit the Cosmic Shop to buy cute decorations!
                </div>
              ) : (
                gameData.inventory.map((item) => {
                  const cat = SHOP_CATALOG.find((c) => c.type === item.itemType);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-purple-500/20 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat?.icon || '📦'}</span>
                        <div>
                          <h4 className="font-bold text-sm text-white">{cat?.name || item.itemType}</h4>
                          <span className="text-xs text-purple-300">Available: x{item.quantity}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePlace(item.itemType)}
                        className="py-1.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Place</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'placed' && (
            <div className="space-y-3">
              {gameData.placedObjects.length === 0 ? (
                <div className="text-center py-10 text-purple-300 text-sm">
                  No decorations placed yet. Place some blossom trees or lamps to cozy up your island!
                </div>
              ) : (
                gameData.placedObjects.map((obj) => {
                  const cat = SHOP_CATALOG.find((c) => c.type === obj.objectType);
                  return (
                    <div
                      key={obj.id}
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-purple-500/20 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat?.icon || '✨'}</span>
                        <div>
                          <h4 className="font-bold text-sm text-white">{cat?.name || obj.objectType}</h4>
                          <span className="text-xs text-purple-400">
                            At coordinates ({obj.tileX}, {obj.tileY})
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeDecoration(obj.id)}
                        className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900 hover:text-white transition"
                        title="Remove decoration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
