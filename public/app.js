const cars = [
  {id:"model3",name:"Model 3",price:40000,description:"Electric sedan · Illustrative price",image:"https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=900&q=80"},
  {id:"modely",name:"Model Y",price:45000,description:"Electric SUV · Illustrative price",image:"https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=80"},
  {id:"cybertruck",name:"Cybertruck",price:80000,description:"Electric pickup · Illustrative price",image:"https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?auto=format&fit=crop&w=900&q=80"}
];
const cart = new Map();
const usd = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function renderCars(){
  document.querySelector("#cars").innerHTML = cars.map(c=>`
    <article class="car-card"><img class="car-image" src="${c.image}" alt="${escapeHtml(c.name)}" loading="lazy">
      <div class="car-info"><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.description)}</p>
        <div class="car-price">${usd(c.price)}</div><div class="car-actions"><button class="primary-button" data-add="${c.id}">Add to cart</button></div>
      </div></article>`).join("");
}
function renderCart(){
  const entries=[...cart.entries()];
  document.querySelector("#cart-count").textContent=entries.reduce((n,[,q])=>n+q,0);
  document.querySelector("#cart-items").innerHTML=entries.length?entries.map(([id,q])=>{
    const c=cars.find(x=>x.id===id);
    return `<div class="cart-row"><span>${escapeHtml(c.name)} × ${q}<br><small>${usd(c.price*q)}</small></span><span><button data-remove="${id}" aria-label="Remove one ${escapeHtml(c.name)}">−</button> <button data-add="${id}" aria-label="Add one ${escapeHtml(c.name)}">+</button></span></div>`;
  }).join(""):'<p class="muted">Your cart is empty.</p>';
  const total=entries.reduce((n,[id,q])=>n+cars.find(c=>c.id===id).price*q,0);
  document.querySelector("#cart-total").textContent=usd(total);
}
document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add]"), remove=e.target.closest("[data-remove]");
  if(add){const id=add.dataset.add;cart.set(id,Math.min(5,(cart.get(id)||0)+1));renderCart();}
  if(remove){const id=remove.dataset.remove,q=(cart.get(id)||0)-1;if(q<=0)cart.delete(id);else cart.set(id,q);renderCart();}
});
document.querySelector("#checkout-form").addEventListener("submit",async e=>{
  e.preventDefault();const msg=document.querySelector("#checkout-message"),entries=[...cart.entries()];
  if(entries.length!==1){msg.textContent="Please select one vehicle model per order.";return;}
  const [carId,quantity]=entries[0],f=new FormData(e.currentTarget);
  const customer={name:f.get("name"),email:f.get("email"),phone:f.get("phone")};
  const address={country:f.get("country"),state:f.get("state"),city:f.get("city"),street:f.get("street"),postalCode:f.get("postalCode")};
  const button=e.currentTarget.querySelector("button[type=submit]");button.disabled=true;msg.textContent="Creating your secure Bitcoin invoice…";
  try{
    const response=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({carId,quantity,customer,address})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to create invoice.");
    sessionStorage.setItem("elonTeslaTrackingToken",result.trackingToken);sessionStorage.setItem("elonTeslaOrderId",result.orderId);
    msg.innerHTML=`Order created. Save these details:<br><strong>Order:</strong> ${escapeHtml(result.orderId)}<br><strong>Private tracking token:</strong> ${escapeHtml(result.trackingToken)}<br><a href="${escapeHtml(result.checkoutUrl)}" target="_blank" rel="noopener noreferrer">Open secure Bitcoin invoice</a>`;
    document.querySelector("#tracking-id").value=result.orderId;document.querySelector("#tracking-token").value=result.trackingToken;
  }catch(err){msg.textContent=err.message;}finally{button.disabled=false;}
});
document.querySelector("#track-button").addEventListener("click",async()=>{
  const id=document.querySelector("#tracking-id").value.trim(),token=document.querySelector("#tracking-token").value.trim()||sessionStorage.getItem("elonTeslaTrackingToken")||"",resultEl=document.querySelector("#tracking-result");
  if(!id||!token){resultEl.textContent="Enter both the order number and private tracking token.";return;}
  resultEl.textContent="Checking order…";
  try{
    const response=await fetch("/api/orders/"+encodeURIComponent(id),{headers:{"X-Tracking-Token":token}});
    const result=await response.json();if(!response.ok)throw new Error(result.error||"Order not found.");
    resultEl.textContent=`${result.vehicle} × ${result.quantity} · ${usd(result.amountUsd)} · Status: ${result.status.replaceAll("_"," ")} · Created: ${new Date(result.createdAt).toLocaleString()}`;
  }catch(err){resultEl.textContent=err.message;}
});
renderCars();renderCart();